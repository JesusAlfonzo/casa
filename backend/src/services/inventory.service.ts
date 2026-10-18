import { Prisma, InventoryMovementType } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type AdjustStockDTO,
  type TransferStockDTO,
  type UpdateInventoryDTO,
  type InventoryQueryDTO,
  type InventoryMovementQueryDTO,
  type InventoryWithDetails,
  type InventoryMovementWithDetails,
  type PaginatedInventoriesResult,
  type PaginatedInventoryMovementsResult,
} from '#types/inventory.types.js';

export class InventoryError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'InventoryError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador de cantidades positivas.
 */
const parsePositiveQty = (
  val: number | string | Prisma.Decimal,
  fieldName: string
): Prisma.Decimal => {
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.lte(0)) {
      throw new InventoryError(
        `La cantidad en ${fieldName} debe ser mayor a 0`,
        400
      );
    }
    return dec;
  } catch (error: any) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError(
      `El valor ingresado en ${fieldName} no es un número válido`,
      400
    );
  }
};

/**
 * Validador para costos unitarios opcionales.
 */
const parseUnitCost = (
  val: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal | null => {
  if (val === null || val === undefined) return null;
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.isNegative()) {
      throw new InventoryError('El costo unitario no puede ser negativo', 400);
    }
    return dec;
  } catch (error: any) {
    if (error instanceof InventoryError) throw error;
    throw new InventoryError('El costo unitario ingresado no es válido', 400);
  }
};

/**
 * Busca o inicializa el registro de inventario para un producto y ubicación dados dentro de una transacción.
 */
const getOrCreateInventoryRecord = async (
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string
) => {
  let record = await tx.inventory.findUnique({
    where: {
      productId_locationId: {
        productId,
        locationId,
      },
    },
  });

  if (!record) {
    record = await tx.inventory.create({
      data: {
        productId,
        locationId,
        currentQuantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
      },
    });
  }

  return record;
};

/**
 * Realizar un ajuste manual de existencias (Positivo, Negativo o Merma) con registro en Kardex.
 */
export const adjustInventoryStock = async (
  dto: AdjustStockDTO
): Promise<{ inventory: InventoryWithDetails; movement: any }> => {
  if (!dto.productId) {
    throw new InventoryError('El ID del producto es obligatorio', 400);
  }

  if (!dto.locationId) {
    throw new InventoryError('El ID de la ubicación es obligatorio', 400);
  }

  const validTypes = [
    'POSITIVE_ADJUSTMENT',
    'NEGATIVE_ADJUSTMENT',
    'SHRINKAGE_OUT',
  ];
  if (!validTypes.includes(dto.type)) {
    throw new InventoryError(
      `Tipo de ajuste inválido. Tipos permitidos: ${validTypes.join(', ')}`,
      400
    );
  }

  const reason = dto.reason?.trim();
  if (!reason || reason.length < 3) {
    throw new InventoryError(
      'Debe ingresar un motivo o justificación clara para el ajuste',
      400
    );
  }

  const qty = parsePositiveQty(dto.quantity, 'ajuste');

  // 1. Validar que el producto exista y esté activo
  const product = await prisma.product.findUnique({
    where: { id: dto.productId },
    include: {
      measurementUnit: true,
    },
  });

  if (!product || product.deletedAt) {
    throw new InventoryError(
      'El producto especificado no existe o ha sido eliminado',
      404
    );
  }

  // 2. Validar regla de decimales según la unidad de medida
  if (!product.measurementUnit.allowsDecimals && qty.decimalPlaces() > 0) {
    throw new InventoryError(
      `La unidad de medida "${product.measurementUnit.name}" (${product.measurementUnit.abbreviation}) no admite fracciones o cantidades decimales`,
      400
    );
  }

  // 3. Validar que la ubicación exista y esté activa
  const location = await prisma.location.findUnique({
    where: { id: dto.locationId },
  });

  if (!location) {
    throw new InventoryError('La ubicación especificada no existe', 404);
  }

  if (!location.isActive) {
    throw new InventoryError(
      `La ubicación "${location.name}" se encuentra desactivada`,
      400
    );
  }

  const cost = parseUnitCost(dto.unitCost) || product.averageCost;

  // 4. Ejecutar ajuste atómico en transacción
  const result = await prisma.$transaction(async (tx) => {
    const inv = await getOrCreateInventoryRecord(
      tx,
      dto.productId,
      dto.locationId
    );

    const previousStock = new Prisma.Decimal(inv.currentQuantity);
    let resultingStock: Prisma.Decimal;

    if (dto.type === 'POSITIVE_ADJUSTMENT') {
      resultingStock = previousStock.plus(qty);
    } else {
      // Ajuste negativo o merma
      if (previousStock.minus(qty).isNegative()) {
        throw new InventoryError(
          `Stock insuficiente en la ubicación "${location.name}". Stock actual: ${previousStock.toString()}, Cantidad requerida para rebajar: ${qty.toString()}`,
          400
        );
      }
      resultingStock = previousStock.minus(qty);
    }

    // Actualizar existencias en la ubicación
    const updatedInventory = await tx.inventory.update({
      where: { id: inv.id },
      data: {
        currentQuantity: resultingStock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            minStockAlert: true,
            baseSalePrice: true,
            averageCost: true,
            measurementUnit: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                allowsDecimals: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
          },
        },
      },
    });

    // Registrar en el Kardex de movimientos
    const movement = await tx.inventoryMovement.create({
      data: {
        inventoryId: inv.id,
        productId: dto.productId,
        movementType: dto.type as InventoryMovementType,
        quantity: qty,
        previousStock,
        resultingStock,
        unitCost: cost,
        userId: dto.userId || null,
        reason,
      },
    });

    return {
      inventory: {
        ...updatedInventory,
        availableQuantity: new Prisma.Decimal(
          updatedInventory.currentQuantity
        ).minus(new Prisma.Decimal(updatedInventory.reservedQuantity)),
      },
      movement,
    };
  });

  return result as any;
};

/**
 * Transferir existencias de un producto entre dos ubicaciones distintas.
 */
export const transferInventoryStock = async (
  dto: TransferStockDTO
): Promise<{
  sourceInventory: InventoryWithDetails;
  destinationInventory: InventoryWithDetails;
  movements: any[];
}> => {
  if (!dto.productId) {
    throw new InventoryError('El ID del producto es obligatorio', 400);
  }

  if (!dto.fromLocationId || !dto.toLocationId) {
    throw new InventoryError(
      'Debe especificar la ubicación de origen y de destino',
      400
    );
  }

  if (dto.fromLocationId === dto.toLocationId) {
    throw new InventoryError(
      'La ubicación de origen y destino no pueden ser iguales',
      400
    );
  }

  const qty = parsePositiveQty(dto.quantity, 'transferencia');

  // 1. Validar producto
  const product = await prisma.product.findUnique({
    where: { id: dto.productId },
    include: {
      measurementUnit: true,
    },
  });

  if (!product || product.deletedAt) {
    throw new InventoryError(
      'El producto especificado no existe o ha sido eliminado',
      404
    );
  }

  if (!product.measurementUnit.allowsDecimals && qty.decimalPlaces() > 0) {
    throw new InventoryError(
      `La unidad de medida "${product.measurementUnit.name}" no admite fracciones o decimales`,
      400
    );
  }

  // 2. Validar ubicaciones
  const [fromLoc, toLoc] = await Promise.all([
    prisma.location.findUnique({ where: { id: dto.fromLocationId } }),
    prisma.location.findUnique({ where: { id: dto.toLocationId } }),
  ]);

  if (!fromLoc || !fromLoc.isActive) {
    throw new InventoryError(
      'La ubicación de origen no existe o se encuentra inactiva',
      404
    );
  }

  if (!toLoc || !toLoc.isActive) {
    throw new InventoryError(
      'La ubicación de destino no existe o se encuentra inactiva',
      404
    );
  }

  // 3. Ejecutar transferencia atómica
  const result = await prisma.$transaction(async (tx) => {
    const sourceInv = await getOrCreateInventoryRecord(
      tx,
      dto.productId,
      dto.fromLocationId
    );
    const destInv = await getOrCreateInventoryRecord(
      tx,
      dto.productId,
      dto.toLocationId
    );

    const availableInSource = new Prisma.Decimal(
      sourceInv.currentQuantity
    ).minus(new Prisma.Decimal(sourceInv.reservedQuantity));

    if (availableInSource.lt(qty)) {
      throw new InventoryError(
        `Stock disponible insuficiente en el origen "${fromLoc.name}". Stock total: ${sourceInv.currentQuantity.toString()}, Reservado: ${sourceInv.reservedQuantity.toString()}, Disponible: ${availableInSource.toString()}`,
        400
      );
    }

    const sourcePreviousStock = new Prisma.Decimal(sourceInv.currentQuantity);
    const sourceResultingStock = sourcePreviousStock.minus(qty);

    const destPreviousStock = new Prisma.Decimal(destInv.currentQuantity);
    const destResultingStock = destPreviousStock.plus(qty);

    // Actualizar origen y destino
    const [updatedSource, updatedDest] = await Promise.all([
      tx.inventory.update({
        where: { id: sourceInv.id },
        data: { currentQuantity: sourceResultingStock },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              minStockAlert: true,
              baseSalePrice: true,
              averageCost: true,
              measurementUnit: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  allowsDecimals: true,
                },
              },
            },
          },
          location: {
            select: { id: true, code: true, name: true, address: true },
          },
        },
      }),
      tx.inventory.update({
        where: { id: destInv.id },
        data: { currentQuantity: destResultingStock },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              minStockAlert: true,
              baseSalePrice: true,
              averageCost: true,
              measurementUnit: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  allowsDecimals: true,
                },
              },
            },
          },
          location: {
            select: { id: true, code: true, name: true, address: true },
          },
        },
      }),
    ]);

    const reasonNote = dto.reason?.trim() || null;

    // Registrar salida en origen
    const outMovement = await tx.inventoryMovement.create({
      data: {
        inventoryId: sourceInv.id,
        productId: dto.productId,
        movementType: 'TRANSFER_OUT',
        quantity: qty,
        previousStock: sourcePreviousStock,
        resultingStock: sourceResultingStock,
        unitCost: product.averageCost,
        userId: dto.userId || null,
        reason:
          reasonNote || `Transferencia hacia "${toLoc.name}" (${toLoc.code})`,
      },
    });

    // Registrar entrada en destino
    const inMovement = await tx.inventoryMovement.create({
      data: {
        inventoryId: destInv.id,
        productId: dto.productId,
        movementType: 'TRANSFER_IN',
        quantity: qty,
        previousStock: destPreviousStock,
        resultingStock: destResultingStock,
        unitCost: product.averageCost,
        userId: dto.userId || null,
        reason:
          reasonNote ||
          `Transferencia desde "${fromLoc.name}" (${fromLoc.code})`,
      },
    });

    return {
      sourceInventory: {
        ...updatedSource,
        availableQuantity: new Prisma.Decimal(
          updatedSource.currentQuantity
        ).minus(new Prisma.Decimal(updatedSource.reservedQuantity)),
      },
      destinationInventory: {
        ...updatedDest,
        availableQuantity: new Prisma.Decimal(
          updatedDest.currentQuantity
        ).minus(new Prisma.Decimal(updatedDest.reservedQuantity)),
      },
      movements: [outMovement, inMovement],
    };
  });

  return result as any;
};

/**
 * Listar existencias en inventario con filtros de stock, búsqueda y paginación.
 */
export const getInventories = async (
  query: InventoryQueryDTO
): Promise<PaginatedInventoriesResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.locationId) {
    where.locationId = query.locationId;
  }

  if (query.categoryId) {
    where.product = { ...where.product, categoryId: query.categoryId };
  }

  if (query.brandId) {
    where.product = { ...where.product, brandId: query.brandId };
  }

  if (query.hasStock === true) {
    where.currentQuantity = { gt: 0 };
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { product: { name: { contains: term, mode: 'insensitive' } } },
      { product: { sku: { contains: term, mode: 'insensitive' } } },
      { product: { barcode: { contains: term, mode: 'insensitive' } } },
      { location: { name: { contains: term, mode: 'insensitive' } } },
      { location: { code: { contains: term, mode: 'insensitive' } } },
      { specificLocation: { contains: term, mode: 'insensitive' } },
    ];
  }

  const allowedSortBy = ['currentQuantity', 'reservedQuantity', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'updatedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, inventories] = await Promise.all([
    prisma.inventory.count({ where }),
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            minStockAlert: true,
            baseSalePrice: true,
            averageCost: true,
            measurementUnit: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                allowsDecimals: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Enriquecer con cálculo de cantidad disponible en memoria
  const enriched = inventories.map((inv) => ({
    ...inv,
    availableQuantity: new Prisma.Decimal(inv.currentQuantity).minus(
      new Prisma.Decimal(inv.reservedQuantity)
    ),
  }));

  return {
    data: enriched as InventoryWithDetails[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Obtener detalle de inventario por su ID.
 */
export const getInventoryById = async (
  id: string
): Promise<InventoryWithDetails> => {
  if (!id) {
    throw new InventoryError(
      'El ID del registro de inventario es requerido',
      400
    );
  }

  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          minStockAlert: true,
          baseSalePrice: true,
          averageCost: true,
          measurementUnit: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              allowsDecimals: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      location: {
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
        },
      },
    },
  });

  if (!inventory) {
    throw new InventoryError('Registro de inventario no encontrado', 404);
  }

  return {
    ...inventory,
    availableQuantity: new Prisma.Decimal(inventory.currentQuantity).minus(
      new Prisma.Decimal(inventory.reservedQuantity)
    ),
  } as InventoryWithDetails;
};

/**
 * Actualizar ubicación específica física dentro del almacén (ej. "Nivel 2, Gaveta 4").
 */
export const updateInventoryDetails = async (
  id: string,
  dto: UpdateInventoryDTO
): Promise<InventoryWithDetails> => {
  if (!id) {
    throw new InventoryError('El ID del inventario es requerido', 400);
  }

  const existing = await prisma.inventory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new InventoryError('Registro de inventario no encontrado', 404);
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      specificLocation:
        dto.specificLocation !== undefined
          ? dto.specificLocation?.trim() || null
          : undefined,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          minStockAlert: true,
          baseSalePrice: true,
          averageCost: true,
          measurementUnit: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
              allowsDecimals: true,
            },
          },
        },
      },
      location: {
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
        },
      },
    },
  });

  return {
    ...updated,
    availableQuantity: new Prisma.Decimal(updated.currentQuantity).minus(
      new Prisma.Decimal(updated.reservedQuantity)
    ),
  } as InventoryWithDetails;
};

/**
 * Consultar el historial de movimientos de inventario (Kardex).
 */
export const getInventoryMovements = async (
  query: InventoryMovementQueryDTO
): Promise<PaginatedInventoryMovementsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.inventoryId) {
    where.inventoryId = query.inventoryId;
  }

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.locationId) {
    where.inventory = { locationId: query.locationId };
  }

  if (query.movementType) {
    where.movementType = query.movementType;
  }

  if (query.fromDate || query.toDate) {
    where.movedAt = {};
    if (query.fromDate) {
      where.movedAt.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      where.movedAt.lte = new Date(query.toDate);
    }
  }

  const [total, movements] = await Promise.all([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { movedAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        inventory: {
          select: {
            id: true,
            location: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: movements as any[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
