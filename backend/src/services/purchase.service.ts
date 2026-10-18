import { Prisma, PurchaseStatus } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreatePurchaseDTO,
  type UpdatePurchaseDTO,
  type ReceivePurchaseItemsDTO,
  type PurchaseQueryDTO,
  type PurchaseWithDetails,
  type PaginatedPurchasesResult,
} from '#types/purchase.types.js';

export class PurchaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'PurchaseError';
    this.statusCode = statusCode;
  }
}

/**
 * Genera un número correlativo estructurado para la orden de compra.
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OC-${timestamp}-${randomPart}`;
};

/**
 * Convertir y validar decimales no negativos.
 */
const parseDecimalNonNegative = (
  val: number | string | Prisma.Decimal | null | undefined,
  field: string
): Prisma.Decimal => {
  if (val === null || val === undefined) return new Prisma.Decimal(0);
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.isNegative()) {
      throw new PurchaseError(
        `El valor de ${field} no puede ser negativo`,
        400
      );
    }
    return dec;
  } catch (error: any) {
    if (error instanceof PurchaseError) throw error;
    throw new PurchaseError(
      `El valor ingresado en ${field} no es un número válido`,
      400
    );
  }
};

/**
 * Convertir y validar cantidades mayores a cero.
 */
const parsePositiveQty = (
  val: number | string | Prisma.Decimal,
  field: string
): Prisma.Decimal => {
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.lte(0)) {
      throw new PurchaseError(
        `La cantidad en ${field} debe ser mayor a 0`,
        400
      );
    }
    return dec;
  } catch (error: any) {
    if (error instanceof PurchaseError) throw error;
    throw new PurchaseError(
      `La cantidad ingresada en ${field} no es válida`,
      400
    );
  }
};

/**
 * Crear una nueva orden de compra de mercancía o servicios.
 */
export const createPurchase = async (
  dto: CreatePurchaseDTO,
  userId?: string | null
): Promise<PurchaseWithDetails> => {
  if (!dto.supplierId) {
    throw new PurchaseError('El proveedor es obligatorio', 400);
  }

  if (!dto.currencyId) {
    throw new PurchaseError('La moneda de la compra es obligatoria', 400);
  }

  if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
    throw new PurchaseError(
      'Debe incluir al menos un ítem o producto en la orden de compra',
      400
    );
  }

  // 1. Validar existencia del proveedor
  const supplier = await prisma.supplier.findUnique({
    where: { id: dto.supplierId },
  });
  if (!supplier || supplier.deletedAt) {
    throw new PurchaseError(
      'El proveedor seleccionado no existe o se encuentra inactivo',
      404
    );
  }

  // 2. Validar existencia de la moneda
  const currency = await prisma.currency.findUnique({
    where: { id: dto.currencyId },
  });
  if (!currency || !currency.isActive) {
    throw new PurchaseError(
      'La moneda seleccionada no existe o se encuentra inactiva',
      404
    );
  }

  // 3. Validar tasa de cambio si se especificó
  let exchangeRateValue = new Prisma.Decimal(1);
  if (dto.exchangeRateId) {
    const rateRecord = await prisma.exchangeRate.findUnique({
      where: { id: dto.exchangeRateId },
    });
    if (!rateRecord || !rateRecord.isActive) {
      throw new PurchaseError(
        'La tasa de cambio seleccionada no es válida o está inactiva',
        404
      );
    }
    exchangeRateValue = new Prisma.Decimal(rateRecord.rate);
  } else if (dto.exchangeRateValue) {
    exchangeRateValue = parseDecimalNonNegative(
      dto.exchangeRateValue,
      'tasa de cambio'
    );
  }

  // 4. Determinar número de orden único
  let orderNumber = dto.orderNumber?.trim().toUpperCase();
  if (!orderNumber) {
    orderNumber = generateOrderNumber();
  } else {
    const existingOrder = await prisma.purchase.findUnique({
      where: { orderNumber },
    });
    if (existingOrder) {
      throw new PurchaseError(
        `Ya existe una orden de compra con el número "${orderNumber}"`,
        409
      );
    }
  }

  // 5. Procesar renglones y calcular subtotales
  let totalSubtotal = new Prisma.Decimal(0);
  let totalTax = new Prisma.Decimal(0);
  let totalDiscount = new Prisma.Decimal(0);

  const processedItems: any[] = [];

  for (const item of dto.items) {
    const qty = parsePositiveQty(item.quantity, 'cantidad de ítem');
    const unitCost = parseDecimalNonNegative(item.unitCost, 'costo unitario');
    const taxPct = parseDecimalNonNegative(
      item.taxPercentage,
      'porcentaje de impuesto'
    );
    const discount = parseDecimalNonNegative(
      item.discountAmount,
      'descuento de ítem'
    );

    // Validar producto si fue provisto
    if (item.productId) {
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { measurementUnit: true },
      });
      if (!prod || prod.deletedAt) {
        throw new PurchaseError(
          `El producto ID "${item.productId}" no existe o fue eliminado`,
          404
        );
      }
      if (!prod.measurementUnit.allowsDecimals && qty.decimalPlaces() > 0) {
        throw new PurchaseError(
          `El producto "${prod.name}" no admite fracciones o cantidades decimales`,
          400
        );
      }
    }

    // Validar ubicación destino si se suministró
    if (item.destinationLocationId) {
      const loc = await prisma.location.findUnique({
        where: { id: item.destinationLocationId },
      });
      if (!loc || !loc.isActive) {
        throw new PurchaseError(
          `La ubicación destino ID "${item.destinationLocationId}" no existe o está inactiva`,
          404
        );
      }
    }

    // Cálculo del renglón
    const grossTotal = qty.times(unitCost);
    const lineTaxable = grossTotal.minus(discount);
    const lineTaxAmount = lineTaxable.times(taxPct).dividedBy(100);
    const lineSubtotal = lineTaxable.plus(lineTaxAmount);

    totalSubtotal = totalSubtotal.plus(grossTotal);
    totalTax = totalTax.plus(lineTaxAmount);
    totalDiscount = totalDiscount.plus(discount);

    processedItems.push({
      productId: item.productId || null,
      serviceId: item.serviceId || null,
      destinationLocationId: item.destinationLocationId || null,
      description: item.description?.trim() || null,
      quantity: qty,
      receivedQuantity: dto.receiveOnCreate ? qty : new Prisma.Decimal(0),
      unitCost,
      taxPercentage: taxPct,
      discountAmount: discount,
      subtotal: lineSubtotal,
    });
  }

  const grandTotal = totalSubtotal.minus(totalDiscount).plus(totalTax);
  const initialStatus: PurchaseStatus = dto.receiveOnCreate
    ? 'RECEIVED'
    : dto.status || 'PENDING';

  // 6. Transacción atómica de creación
  const purchase = await prisma.$transaction(async (tx) => {
    const createdPurchase = await tx.purchase.create({
      data: {
        orderNumber,
        supplierInvoiceNumber: dto.supplierInvoiceNumber?.trim() || null,
        supplierId: dto.supplierId,
        userId: userId || null,
        currencyId: dto.currencyId,
        exchangeRateId: dto.exchangeRateId || null,
        exchangeRateValue,
        status: initialStatus,
        subtotal: totalSubtotal,
        taxAmount: totalTax,
        discountAmount: totalDiscount,
        total: grandTotal,
        totalPaid: new Prisma.Decimal(0),
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes?.trim() || null,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                measurementUnit: {
                  select: { id: true, name: true, abbreviation: true },
                },
              },
            },
            destinationLocation: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            taxId: true,
            phone: true,
            email: true,
          },
        },
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        exchangeRate: {
          select: { id: true, rate: true, source: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Si se indicó ingreso inmediato al almacén, acreditar existencias y movimientos
    if (dto.receiveOnCreate) {
      for (const item of createdPurchase.items) {
        if (item.productId && item.destinationLocationId) {
          // 1. Obtener o crear inventario
          let inv = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: item.destinationLocationId,
              },
            },
          });

          if (!inv) {
            inv = await tx.inventory.create({
              data: {
                productId: item.productId,
                locationId: item.destinationLocationId,
                currentQuantity: new Prisma.Decimal(0),
                reservedQuantity: new Prisma.Decimal(0),
              },
            });
          }

          const previousStock = new Prisma.Decimal(inv.currentQuantity);
          const resultingStock = previousStock.plus(
            new Prisma.Decimal(item.quantity)
          );

          await tx.inventory.update({
            where: { id: inv.id },
            data: { currentQuantity: resultingStock },
          });

          // 2. Registrar movimiento en Kardex
          await tx.inventoryMovement.create({
            data: {
              inventoryId: inv.id,
              productId: item.productId,
              movementType: 'PURCHASE_IN',
              quantity: new Prisma.Decimal(item.quantity),
              previousStock,
              resultingStock,
              unitCost: new Prisma.Decimal(item.unitCost),
              purchaseItemId: item.id,
              userId: userId || null,
              reason: `Entrada por Compra "${createdPurchase.orderNumber}"`,
            },
          });

          // 3. Actualizar costo pactado del proveedor
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId: createdPurchase.supplierId,
                productId: item.productId,
              },
            },
            create: {
              supplierId: createdPurchase.supplierId,
              productId: item.productId,
              lastCost: new Prisma.Decimal(item.unitCost),
            },
            update: {
              lastCost: new Prisma.Decimal(item.unitCost),
            },
          });
        }
      }
    }

    return createdPurchase;
  });

  return purchase as PurchaseWithDetails;
};

/**
 * Listar compras con paginación, filtros de proveedor, estatus, moneda y fechas.
 */
export const getPurchases = async (
  query: PurchaseQueryDTO
): Promise<PaginatedPurchasesResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.supplierId) {
    where.supplierId = query.supplierId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.currencyId) {
    where.currencyId = query.currencyId;
  }

  if (query.fromDate || query.toDate) {
    where.purchasedAt = {};
    if (query.fromDate) where.purchasedAt.gte = new Date(query.fromDate);
    if (query.toDate) where.purchasedAt.lte = new Date(query.toDate);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: 'insensitive' } },
      { supplierInvoiceNumber: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
      { supplier: { legalName: { contains: term, mode: 'insensitive' } } },
      { supplier: { tradeName: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const allowedSortBy = ['orderNumber', 'purchasedAt', 'total', 'createdAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'purchasedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, purchases] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            taxId: true,
            phone: true,
            email: true,
          },
        },
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        exchangeRate: {
          select: { id: true, rate: true, source: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            items: true,
            payments: true,
            streamingAccounts: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: purchases as any[],
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
 * Obtener detalle completo de una orden de compra por su ID.
 */
export const getPurchaseById = async (
  id: string
): Promise<PurchaseWithDetails> => {
  if (!id) {
    throw new PurchaseError('El ID de la compra es requerido', 400);
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          taxId: true,
          phone: true,
          email: true,
          address: true,
        },
      },
      currency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      exchangeRate: {
        select: { id: true, rate: true, source: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              measurementUnit: {
                select: { id: true, name: true, abbreviation: true },
              },
            },
          },
          destinationLocation: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      payments: true,
      _count: {
        select: {
          items: true,
          payments: true,
          streamingAccounts: true,
        },
      },
    },
  });

  if (!purchase) {
    throw new PurchaseError('Orden de compra no encontrada', 404);
  }

  return purchase as any;
};

/**
 * Recibir mercancía física de una orden de compra, alimentando el almacén y el Kardex.
 */
export const receivePurchaseItems = async (
  purchaseId: string,
  dto: ReceivePurchaseItemsDTO,
  userId?: string | null
): Promise<PurchaseWithDetails> => {
  if (!purchaseId) {
    throw new PurchaseError('El ID de la compra es requerido', 400);
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: true,
    },
  });

  if (!purchase) {
    throw new PurchaseError('Orden de compra no encontrada', 404);
  }

  if (purchase.status === 'CANCELLED') {
    throw new PurchaseError(
      'No se pueden recibir ítems de una orden de compra cancelada',
      400
    );
  }

  if (purchase.status === 'RECEIVED') {
    throw new PurchaseError(
      'Esta orden de compra ya ha sido recibida en su totalidad',
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.items) {
      // Determinar la cantidad a recibir
      let qtyToReceive: Prisma.Decimal;

      if (dto.items && dto.items.length > 0) {
        const itemInput = dto.items.find((i) => i.purchaseItemId === item.id);
        if (!itemInput) continue;
        qtyToReceive = parsePositiveQty(
          itemInput.receivedQuantity,
          'cantidad a recibir'
        );
      } else {
        // Si no se detalló renglón por renglón, recibir la totalidad pendiente
        qtyToReceive = new Prisma.Decimal(item.quantity).minus(
          new Prisma.Decimal(item.receivedQuantity)
        );
      }

      if (qtyToReceive.lte(0)) continue;

      const pendingQty = new Prisma.Decimal(item.quantity).minus(
        new Prisma.Decimal(item.receivedQuantity)
      );
      if (qtyToReceive.gt(pendingQty)) {
        throw new PurchaseError(
          `La cantidad a recibir (${qtyToReceive.toString()}) supera el saldo pendiente (${pendingQty.toString()}) en el ítem`,
          400
        );
      }

      const newReceivedQty = new Prisma.Decimal(item.receivedQuantity).plus(
        qtyToReceive
      );

      // Actualizar línea de compra
      await tx.purchaseItem.update({
        where: { id: item.id },
        data: { receivedQuantity: newReceivedQty },
      });

      // Si es un producto con destino a almacén, acreditar existencias
      if (item.productId) {
        const destinationLocId = item.destinationLocationId;
        if (!destinationLocId) {
          throw new PurchaseError(
            `El producto en el ítem "${item.description || item.productId}" no tiene una ubicación de almacén destino configurada`,
            400
          );
        }

        let inv = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: destinationLocId,
            },
          },
        });

        if (!inv) {
          inv = await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: destinationLocId,
              currentQuantity: new Prisma.Decimal(0),
              reservedQuantity: new Prisma.Decimal(0),
            },
          });
        }

        const previousStock = new Prisma.Decimal(inv.currentQuantity);
        const resultingStock = previousStock.plus(qtyToReceive);

        await tx.inventory.update({
          where: { id: inv.id },
          data: { currentQuantity: resultingStock },
        });

        // Registrar en Kardex
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inv.id,
            productId: item.productId,
            movementType: 'PURCHASE_IN',
            quantity: qtyToReceive,
            previousStock,
            resultingStock,
            unitCost: new Prisma.Decimal(item.unitCost),
            purchaseItemId: item.id,
            userId: userId || null,
            reason: `Recepción de mercancía por Compra "${purchase.orderNumber}"`,
          },
        });

        // Actualizar último costo en relación proveedor-producto
        await tx.supplierProduct.upsert({
          where: {
            supplierId_productId: {
              supplierId: purchase.supplierId,
              productId: item.productId,
            },
          },
          create: {
            supplierId: purchase.supplierId,
            productId: item.productId,
            lastCost: new Prisma.Decimal(item.unitCost),
          },
          update: {
            lastCost: new Prisma.Decimal(item.unitCost),
          },
        });
      }
    }

    // Verificar si todos los ítems fueron recibidos al 100%
    const allItems = await tx.purchaseItem.findMany({
      where: { purchaseId },
    });

    const isFullyReceived = allItems.every((it) =>
      new Prisma.Decimal(it.receivedQuantity).gte(
        new Prisma.Decimal(it.quantity)
      )
    );

    if (isFullyReceived) {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'RECEIVED' },
      });
    }
  });

  return await getPurchaseById(purchaseId);
};

/**
 * Actualizar datos generales o estado de una compra (si no está cerrada/cancelada).
 */
export const updatePurchase = async (
  id: string,
  dto: UpdatePurchaseDTO
): Promise<PurchaseWithDetails> => {
  if (!id) {
    throw new PurchaseError('El ID de la compra es requerido', 400);
  }

  const existing = await prisma.purchase.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new PurchaseError('Orden de compra no encontrada', 404);
  }

  if (existing.status === 'CANCELLED') {
    throw new PurchaseError(
      'No se puede modificar una orden de compra cancelada',
      400
    );
  }

  const updateData: any = {};

  if (dto.supplierInvoiceNumber !== undefined) {
    updateData.supplierInvoiceNumber = dto.supplierInvoiceNumber
      ? dto.supplierInvoiceNumber.trim()
      : null;
  }

  if (dto.dueDate !== undefined) {
    updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
  }

  if (dto.notes !== undefined) {
    updateData.notes = dto.notes ? dto.notes.trim() : null;
  }

  if (dto.status !== undefined) {
    if (dto.status === 'RECEIVED' && existing.status !== 'RECEIVED') {
      throw new PurchaseError(
        'Para marcar la compra como RECIBIDA, utilice el endpoint de recepción de mercancía',
        400
      );
    }
    updateData.status = dto.status;
  }

  await prisma.purchase.update({
    where: { id },
    data: updateData,
  });

  return await getPurchaseById(id);
};

/**
 * Cancelar una orden de compra.
 * Solo permitido si no se ha recibido mercancía en almacén.
 */
export const cancelPurchase = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new PurchaseError('El ID de la compra es requerido', 400);
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!purchase) {
    throw new PurchaseError('Orden de compra no encontrada', 404);
  }

  if (purchase.status === 'CANCELLED') {
    throw new PurchaseError('La orden de compra ya está cancelada', 400);
  }

  // Verificar si hay recepciones de mercancía
  const hasReceivedItems = purchase.items.some((it) =>
    new Prisma.Decimal(it.receivedQuantity).gt(0)
  );

  if (hasReceivedItems) {
    throw new PurchaseError(
      'No se puede cancelar una orden de compra que ya posee mercancía ingresada al almacén. Debe realizar un ajuste de inventario o devolución primero.',
      400
    );
  }

  if (purchase.payments.length > 0) {
    throw new PurchaseError(
      'No se puede cancelar una orden de compra con pagos financieros registrados. Anule o devuelva los pagos primero.',
      400
    );
  }

  await prisma.purchase.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return {
    success: true,
    message: `Orden de compra "${purchase.orderNumber}" cancelada exitosamente`,
  };
};
