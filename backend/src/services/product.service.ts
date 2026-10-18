import { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateProductDTO,
  type UpdateProductDTO,
  type ProductQueryDTO,
  type ProductWithDetails,
  type PaginatedProductsResult,
} from '#types/product.types.js';

export class ProductError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ProductError';
    this.statusCode = statusCode;
  }
}

/**
 * Genera un SKU aleatorio estructurado si no es proporcionado por el usuario.
 */
const generateRandomSKU = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRD-${timestamp}-${randomPart}`;
};

/**
 * Validar coherencia numérica de importes decimales.
 */
const parseDecimal = (
  value: number | string | Prisma.Decimal,
  fieldName: string
): Prisma.Decimal => {
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) {
      throw new ProductError(
        `El valor de ${fieldName} no puede ser negativo`,
        400
      );
    }
    return decimal;
  } catch (error: any) {
    if (error instanceof ProductError) throw error;
    throw new ProductError(
      `El valor proporcionado para ${fieldName} no es un número válido`,
      400
    );
  }
};

/**
 * Crear un nuevo producto en el catálogo.
 */
export const createProduct = async (
  dto: CreateProductDTO
): Promise<ProductWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new ProductError('El nombre del producto es obligatorio', 400);
  }

  if (!dto.categoryId) {
    throw new ProductError('La categoría del producto es obligatoria', 400);
  }

  if (!dto.measurementUnitId) {
    throw new ProductError('La unidad de medida es obligatoria', 400);
  }

  if (dto.baseSalePrice === undefined || dto.baseSalePrice === null) {
    throw new ProductError('El precio base de venta es obligatorio', 400);
  }

  // 1. Validar existencia de la categoría
  const categoryExists = await prisma.category.findUnique({
    where: { id: dto.categoryId },
  });
  if (!categoryExists) {
    throw new ProductError('La categoría especificada no existe', 404);
  }

  // 2. Validar existencia de la unidad de medida
  const unitExists = await prisma.measurementUnit.findUnique({
    where: { id: dto.measurementUnitId },
  });
  if (!unitExists) {
    throw new ProductError('La unidad de medida especificada no existe', 404);
  }

  // 3. Validar existencia de la marca si fue provista
  if (dto.brandId) {
    const brandExists = await prisma.brand.findUnique({
      where: { id: dto.brandId },
    });
    if (!brandExists) {
      throw new ProductError('La marca especificada no existe', 404);
    }
  }

  // 4. Determinar y validar SKU
  let sku = dto.sku?.trim().toUpperCase();
  if (!sku) {
    sku = generateRandomSKU();
  } else {
    const existingSKU = await prisma.product.findUnique({
      where: { sku },
    });
    if (existingSKU) {
      throw new ProductError(
        `Ya existe un producto con el código SKU "${sku}"`,
        409
      );
    }
  }

  // 5. Validar código de barras si fue provisto
  const barcode = dto.barcode?.trim() || null;
  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode },
    });
    if (existingBarcode) {
      throw new ProductError(
        `Ya existe un producto con el código de barras "${barcode}"`,
        409
      );
    }
  }

  // 6. Conversión y validación de precios y cantidades
  const baseSalePrice = parseDecimal(dto.baseSalePrice, 'precio base de venta');
  const averageCost =
    dto.averageCost !== undefined && dto.averageCost !== null
      ? parseDecimal(dto.averageCost, 'costo promedio')
      : new Prisma.Decimal(0);
  const wholesalePrice =
    dto.wholesalePrice !== undefined && dto.wholesalePrice !== null
      ? parseDecimal(dto.wholesalePrice, 'precio mayorista')
      : null;
  const minStockAlert =
    dto.minStockAlert !== undefined && dto.minStockAlert !== null
      ? parseDecimal(dto.minStockAlert, 'alerta de stock mínimo')
      : new Prisma.Decimal(0);

  const product = await prisma.product.create({
    data: {
      sku,
      barcode,
      name,
      description: dto.description?.trim() || null,
      measurementUnitId: dto.measurementUnitId,
      brandId: dto.brandId || null,
      categoryId: dto.categoryId,
      averageCost,
      baseSalePrice,
      wholesalePrice,
      minStockAlert,
      imageUrl: dto.imageUrl?.trim() || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      measurementUnit: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          allowsDecimals: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          inventories: true,
          purchaseItems: true,
          saleItems: true,
          suppliers: true,
        },
      },
    },
  });

  return product;
};

/**
 * Listar productos con filtros avanzados, búsqueda y paginación.
 */
export const getProducts = async (
  query: ProductQueryDTO
): Promise<PaginatedProductsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Omitir productos eliminados por defecto
  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  // Filtro por estado activo / inactivo
  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  // Filtros por relaciones
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.brandId) {
    where.brandId = query.brandId;
  }

  if (query.measurementUnitId) {
    where.measurementUnitId = query.measurementUnitId;
  }

  // Rango de precio
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.baseSalePrice = {};
    if (query.minPrice !== undefined) {
      where.baseSalePrice.gte = new Prisma.Decimal(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.baseSalePrice.lte = new Prisma.Decimal(query.maxPrice);
    }
  }

  // Búsqueda textual multicanal
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { sku: { contains: term, mode: 'insensitive' } },
      { barcode: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Ordenamiento permitido
  const allowedSortBy = [
    'name',
    'sku',
    'baseSalePrice',
    'averageCost',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        measurementUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            allowsDecimals: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            inventories: true,
            purchaseItems: true,
            saleItems: true,
            suppliers: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: products,
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
 * Obtener detalle completo de un producto por su ID único.
 */
export const getProductById = async (
  id: string
): Promise<ProductWithDetails> => {
  if (!id) {
    throw new ProductError('El ID del producto es requerido', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      measurementUnit: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          allowsDecimals: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      inventories: {
        select: {
          id: true,
          locationId: true,
          currentQuantity: true,
          reservedQuantity: true,
          specificLocation: true,
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          inventories: true,
          purchaseItems: true,
          saleItems: true,
          suppliers: true,
        },
      },
    },
  });

  if (!product) {
    throw new ProductError('Producto no encontrado', 404);
  }

  return product;
};

/**
 * Actualizar un producto existente.
 */
export const updateProduct = async (
  id: string,
  dto: UpdateProductDTO
): Promise<ProductWithDetails> => {
  if (!id) {
    throw new ProductError('El ID del producto es requerido', 400);
  }

  const existing = await prisma.product.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ProductError('Producto no encontrado', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new ProductError(
        'El nombre del producto no puede estar vacío',
        400
      );
    }
    updateData.name = trimmedName;
  }

  if (dto.description !== undefined) {
    updateData.description = dto.description ? dto.description.trim() : null;
  }

  if (dto.sku !== undefined) {
    const trimmedSku = dto.sku.trim().toUpperCase();
    if (!trimmedSku) {
      throw new ProductError('El SKU no puede estar vacío', 400);
    }

    const duplicateSku = await prisma.product.findFirst({
      where: {
        sku: trimmedSku,
        NOT: { id },
      },
    });

    if (duplicateSku) {
      throw new ProductError(
        `Ya existe otro producto con el SKU "${trimmedSku}"`,
        409
      );
    }

    updateData.sku = trimmedSku;
  }

  if (dto.barcode !== undefined) {
    const trimmedBarcode = dto.barcode ? dto.barcode.trim() : null;

    if (trimmedBarcode) {
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          barcode: trimmedBarcode,
          NOT: { id },
        },
      });

      if (duplicateBarcode) {
        throw new ProductError(
          `Ya existe otro producto con el código de barras "${trimmedBarcode}"`,
          409
        );
      }
    }

    updateData.barcode = trimmedBarcode;
  }

  if (dto.categoryId !== undefined) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExists) {
      throw new ProductError('La categoría especificada no existe', 404);
    }
    updateData.categoryId = dto.categoryId;
  }

  if (dto.measurementUnitId !== undefined) {
    const unitExists = await prisma.measurementUnit.findUnique({
      where: { id: dto.measurementUnitId },
    });
    if (!unitExists) {
      throw new ProductError('La unidad de medida especificada no existe', 404);
    }
    updateData.measurementUnitId = dto.measurementUnitId;
  }

  if (dto.brandId !== undefined) {
    if (dto.brandId) {
      const brandExists = await prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brandExists) {
        throw new ProductError('La marca especificada no existe', 404);
      }
    }
    updateData.brandId = dto.brandId || null;
  }

  if (dto.baseSalePrice !== undefined) {
    updateData.baseSalePrice = parseDecimal(
      dto.baseSalePrice,
      'precio base de venta'
    );
  }

  if (dto.averageCost !== undefined) {
    updateData.averageCost = parseDecimal(dto.averageCost, 'costo promedio');
  }

  if (dto.wholesalePrice !== undefined) {
    updateData.wholesalePrice =
      dto.wholesalePrice !== null
        ? parseDecimal(dto.wholesalePrice, 'precio mayorista')
        : null;
  }

  if (dto.minStockAlert !== undefined) {
    updateData.minStockAlert = parseDecimal(
      dto.minStockAlert,
      'alerta de stock mínimo'
    );
  }

  if (dto.imageUrl !== undefined) {
    updateData.imageUrl = dto.imageUrl ? dto.imageUrl.trim() : null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      measurementUnit: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          allowsDecimals: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          inventories: true,
          purchaseItems: true,
          saleItems: true,
          suppliers: true,
        },
      },
    },
  });

  return updatedProduct;
};

/**
 * Eliminar un producto.
 * Si cuenta con historial de ventas, compras o movimientos de inventario, se efectúa un soft-delete.
 * Si no posee historial, se elimina de forma física.
 */
export const deleteProduct = async (
  id: string
): Promise<{ success: boolean; message: string; softDeleted: boolean }> => {
  if (!id) {
    throw new ProductError('El ID del producto es requerido', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchaseItems: true,
          saleItems: true,
          inventoryMovements: true,
        },
      },
    },
  });

  if (!product) {
    throw new ProductError('Producto no encontrado', 404);
  }

  const hasHistory =
    product._count.purchaseItems > 0 ||
    product._count.saleItems > 0 ||
    product._count.inventoryMovements > 0;

  if (hasHistory) {
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      success: true,
      message: `Producto "${product.name}" archivado y desactivado exitosamente para preservar la trazabilidad histórica de ventas y compras`,
      softDeleted: true,
    };
  }

  await prisma.product.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Producto "${product.name}" eliminado de forma definitiva`,
    softDeleted: false,
  };
};

/**
 * Alternar el estado activo / inactivo de un producto.
 */
export const toggleProductStatus = async (
  id: string
): Promise<ProductWithDetails> => {
  if (!id) {
    throw new ProductError('El ID del producto es requerido', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new ProductError('Producto no encontrado', 404);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      isActive: !product.isActive,
    },
    include: {
      measurementUnit: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          allowsDecimals: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          inventories: true,
          purchaseItems: true,
          saleItems: true,
          suppliers: true,
        },
      },
    },
  });

  return updated;
};
