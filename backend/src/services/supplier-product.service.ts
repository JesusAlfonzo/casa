import { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type AssignSupplierProductDTO,
  type UpdateSupplierProductDTO,
  type SupplierProductQueryDTO,
  type SupplierProductWithDetails,
  type PaginatedSupplierProductsResult,
} from '#types/supplier-product.types.js';

export class SupplierProductError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SupplierProductError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador y convertidor para costos de proveedor.
 */
const parseCost = (
  value: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal | null => {
  if (value === null || value === undefined) return null;
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) {
      throw new SupplierProductError(
        'El costo pactado con el proveedor no puede ser negativo',
        400
      );
    }
    return decimal;
  } catch (error: any) {
    if (error instanceof SupplierProductError) throw error;
    throw new SupplierProductError(
      'El costo proporcionado no es un número válido',
      400
    );
  }
};

/**
 * Asociar un producto a un proveedor con código propio (SKU) y costo pactado.
 */
export const assignSupplierProduct = async (
  dto: AssignSupplierProductDTO
): Promise<SupplierProductWithDetails> => {
  if (!dto.supplierId) {
    throw new SupplierProductError('El ID del proveedor es obligatorio', 400);
  }

  if (!dto.productId) {
    throw new SupplierProductError('El ID del producto es obligatorio', 400);
  }

  // 1. Validar que el proveedor exista y no esté eliminado
  const supplier = await prisma.supplier.findUnique({
    where: { id: dto.supplierId },
  });

  if (!supplier || supplier.deletedAt) {
    throw new SupplierProductError(
      'El proveedor especificado no existe o ha sido eliminado',
      404
    );
  }

  // 2. Validar que el producto exista y no esté eliminado
  const product = await prisma.product.findUnique({
    where: { id: dto.productId },
  });

  if (!product || product.deletedAt) {
    throw new SupplierProductError(
      'El producto especificado no existe o ha sido eliminado',
      404
    );
  }

  // 3. Validar que no exista ya la asociación
  const existing = await prisma.supplierProduct.findUnique({
    where: {
      supplierId_productId: {
        supplierId: dto.supplierId,
        productId: dto.productId,
      },
    },
  });

  if (existing) {
    throw new SupplierProductError(
      'Este producto ya se encuentra vinculado a este proveedor. Puede editar sus condiciones existentes.',
      409
    );
  }

  const lastCost = parseCost(dto.lastCost);
  const isPrimary = Boolean(dto.isPrimarySupplier);

  // Ejecutar en transacción para garantizar un único proveedor primario por producto
  const relation = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.supplierProduct.updateMany({
        where: { productId: dto.productId },
        data: { isPrimarySupplier: false },
      });
    }

    return await tx.supplierProduct.create({
      data: {
        supplierId: dto.supplierId,
        productId: dto.productId,
        supplierSku: dto.supplierSku?.trim() || null,
        lastCost,
        isPrimarySupplier: isPrimary,
      },
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
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            baseSalePrice: true,
            averageCost: true,
          },
        },
      },
    });
  });

  return relation;
};

/**
 * Listar asociaciones entre proveedores y productos con paginación, filtros y búsqueda.
 */
export const getSupplierProducts = async (
  query: SupplierProductQueryDTO
): Promise<PaginatedSupplierProductsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.supplierId) {
    where.supplierId = query.supplierId;
  }

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.isPrimarySupplier !== undefined) {
    where.isPrimarySupplier = Boolean(query.isPrimarySupplier);
  }

  // Búsqueda textual por SKU de proveedor, nombre/SKU del producto, o nombre del proveedor
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { supplierSku: { contains: term, mode: 'insensitive' } },
      { product: { name: { contains: term, mode: 'insensitive' } } },
      { product: { sku: { contains: term, mode: 'insensitive' } } },
      { supplier: { legalName: { contains: term, mode: 'insensitive' } } },
      { supplier: { tradeName: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const allowedSortBy = ['updatedAt', 'lastCost'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'updatedAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, items] = await Promise.all([
    prisma.supplierProduct.count({ where }),
    prisma.supplierProduct.findMany({
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
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            baseSalePrice: true,
            averageCost: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: items,
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
 * Obtener detalle de un enlace proveedor-producto por ID.
 */
export const getSupplierProductById = async (
  id: string
): Promise<SupplierProductWithDetails> => {
  if (!id) {
    throw new SupplierProductError('El ID del registro es requerido', 400);
  }

  const item = await prisma.supplierProduct.findUnique({
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
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          baseSalePrice: true,
          averageCost: true,
        },
      },
    },
  });

  if (!item) {
    throw new SupplierProductError(
      'Vínculo entre proveedor y producto no encontrado',
      404
    );
  }

  return item;
};

/**
 * Actualizar datos de la asociación proveedor-producto (SKU del proveedor, costo pactado, estatus primario).
 */
export const updateSupplierProduct = async (
  id: string,
  dto: UpdateSupplierProductDTO
): Promise<SupplierProductWithDetails> => {
  if (!id) {
    throw new SupplierProductError('El ID del registro es requerido', 400);
  }

  const existing = await prisma.supplierProduct.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SupplierProductError(
      'Vínculo entre proveedor y producto no encontrado',
      404
    );
  }

  const updateData: any = {};

  if (dto.supplierSku !== undefined) {
    updateData.supplierSku = dto.supplierSku ? dto.supplierSku.trim() : null;
  }

  if (dto.lastCost !== undefined) {
    updateData.lastCost = parseCost(dto.lastCost);
  }

  const isPrimary =
    dto.isPrimarySupplier !== undefined
      ? Boolean(dto.isPrimarySupplier)
      : undefined;
  if (isPrimary !== undefined) {
    updateData.isPrimarySupplier = isPrimary;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Si se marca como proveedor primario, retirar la marca a los demás proveedores de este mismo producto
    if (isPrimary === true) {
      await tx.supplierProduct.updateMany({
        where: {
          productId: existing.productId,
          NOT: { id },
        },
        data: { isPrimarySupplier: false },
      });
    }

    return await tx.supplierProduct.update({
      where: { id },
      data: updateData,
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
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            baseSalePrice: true,
            averageCost: true,
          },
        },
      },
    });
  });

  return updated;
};

/**
 * Establecer este proveedor como el proveedor primario/predeterminado del producto.
 */
export const setPrimarySupplier = async (
  id: string
): Promise<SupplierProductWithDetails> => {
  return await updateSupplierProduct(id, { isPrimarySupplier: true });
};

/**
 * Eliminar el vínculo entre un proveedor y un producto.
 */
export const removeSupplierProduct = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new SupplierProductError('El ID del registro es requerido', 400);
  }

  const existing = await prisma.supplierProduct.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SupplierProductError(
      'Vínculo entre proveedor y producto no encontrado',
      404
    );
  }

  await prisma.supplierProduct.delete({
    where: { id },
  });

  return {
    success: true,
    message: 'Producto desvinculado del proveedor exitosamente',
  };
};
