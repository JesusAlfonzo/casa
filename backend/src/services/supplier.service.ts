import { prisma } from '#config/prisma.js';
import {
  type CreateSupplierDTO,
  type UpdateSupplierDTO,
  type SupplierQueryDTO,
  type SupplierWithCount,
  type SupplierDetail,
  type PaginatedSuppliersResult,
} from '#types/supplier.types.js';

export class SupplierError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SupplierError';
    this.statusCode = statusCode;
  }
}

/**
 * Crear un nuevo proveedor en el sistema.
 */
export const createSupplier = async (
  dto: CreateSupplierDTO
): Promise<SupplierWithCount> => {
  const legalName = dto.legalName?.trim();

  if (!legalName) {
    throw new SupplierError(
      'La razón social o nombre legal del proveedor es obligatorio',
      400
    );
  }

  const taxId = dto.taxId?.trim() || null;

  // Si se proporcionó un taxId (RIF, NIT, CIF, etc.), verificar que no esté duplicado
  if (taxId) {
    const existingTaxId = await prisma.supplier.findUnique({
      where: { taxId },
    });

    if (existingTaxId) {
      throw new SupplierError(
        `Ya existe un proveedor registrado con el documento/RIF/NIT "${taxId}"`,
        409
      );
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      legalName,
      tradeName: dto.tradeName?.trim() || null,
      taxId,
      contactName: dto.contactName?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: {
          products: true,
          purchases: true,
          streamingAccounts: true,
        },
      },
    },
  });

  return supplier;
};

/**
 * Listar proveedores con paginación, filtros de búsqueda, estado y ordenamiento.
 */
export const getSuppliers = async (
  query: SupplierQueryDTO
): Promise<PaginatedSuppliersResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Por defecto se omiten los proveedores eliminados mediante soft-delete
  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  // Filtro por estado activo / inactivo
  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  // Filtro de búsqueda textual en múltiples campos
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { legalName: { contains: term, mode: 'insensitive' } },
      { tradeName: { contains: term, mode: 'insensitive' } },
      { taxId: { contains: term, mode: 'insensitive' } },
      { contactName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Ordenamiento permitido
  const allowedSortBy = [
    'legalName',
    'tradeName',
    'taxId',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'legalName';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            products: true,
            purchases: true,
            streamingAccounts: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: suppliers,
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
 * Obtener detalle de un proveedor por su ID único incluyendo productos vinculados y compras recientes.
 */
export const getSupplierById = async (
  id: string
): Promise<SupplierDetail> => {
  if (!id) {
    throw new SupplierError('El ID del proveedor es requerido', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              baseSalePrice: true,
              averageCost: true,
            },
          },
        },
      },
      purchases: {
        take: 10,
        orderBy: { purchasedAt: 'desc' },
        include: {
          currency: {
            select: {
              id: true,
              code: true,
              symbol: true,
            },
          },
        },
      },
      _count: {
        select: {
          products: true,
          purchases: true,
          streamingAccounts: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new SupplierError('Proveedor no encontrado', 404);
  }

  return supplier as unknown as SupplierDetail;
};

/**
 * Actualizar un proveedor existente.
 */
export const updateSupplier = async (
  id: string,
  dto: UpdateSupplierDTO
): Promise<SupplierWithCount> => {
  if (!id) {
    throw new SupplierError('El ID del proveedor es requerido', 400);
  }

  const existing = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new SupplierError('Proveedor no encontrado', 404);
  }

  const updateData: any = {};

  if (dto.legalName !== undefined) {
    const trimmedLegalName = dto.legalName.trim();
    if (!trimmedLegalName) {
      throw new SupplierError(
        'La razón social o nombre legal no puede estar vacía',
        400
      );
    }
    updateData.legalName = trimmedLegalName;
  }

  if (dto.tradeName !== undefined) {
    updateData.tradeName = dto.tradeName ? dto.tradeName.trim() : null;
  }

  if (dto.taxId !== undefined) {
    const trimmedTaxId = dto.taxId ? dto.taxId.trim() : null;

    if (trimmedTaxId) {
      const duplicateTaxId = await prisma.supplier.findFirst({
        where: {
          taxId: trimmedTaxId,
          NOT: { id },
        },
      });

      if (duplicateTaxId) {
        throw new SupplierError(
          `Ya existe otro proveedor con el documento/RIF/NIT "${trimmedTaxId}"`,
          409
        );
      }
    }

    updateData.taxId = trimmedTaxId;
  }

  if (dto.contactName !== undefined) {
    updateData.contactName = dto.contactName ? dto.contactName.trim() : null;
  }

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone ? dto.phone.trim() : null;
  }

  if (dto.email !== undefined) {
    updateData.email = dto.email ? dto.email.trim() : null;
  }

  if (dto.address !== undefined) {
    updateData.address = dto.address ? dto.address.trim() : null;
  }

  if (dto.notes !== undefined) {
    updateData.notes = dto.notes ? dto.notes.trim() : null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          products: true,
          purchases: true,
          streamingAccounts: true,
        },
      },
    },
  });

  return updatedSupplier;
};

/**
 * Eliminar un proveedor.
 * Si cuenta con historial de compras o cuentas asociadas, se realiza un borrado lógico (soft-delete)
 * para preservar la integridad financiera y de auditoría. Si no posee historial, se remueve completamente.
 */
export const deleteSupplier = async (
  id: string
): Promise<{ success: boolean; message: string; softDeleted: boolean }> => {
  if (!id) {
    throw new SupplierError('El ID del proveedor es requerido', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true,
          purchases: true,
          streamingAccounts: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new SupplierError('Proveedor no encontrado', 404);
  }

  const hasHistory =
    supplier._count.purchases > 0 || supplier._count.streamingAccounts > 0;

  if (hasHistory) {
    await prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      success: true,
      message: `Proveedor "${supplier.legalName}" desactivado y archivado exitosamente para preservar el historial de compras y cuentas`,
      softDeleted: true,
    };
  }

  // Si no tiene compras ni cuentas asociadas, se puede eliminar físicamente
  await prisma.supplier.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Proveedor "${supplier.legalName}" eliminado de forma definitiva`,
    softDeleted: false,
  };
};

/**
 * Alternar el estado activo / inactivo de un proveedor.
 */
export const toggleSupplierStatus = async (
  id: string
): Promise<SupplierWithCount> => {
  if (!id) {
    throw new SupplierError('El ID del proveedor es requerido', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    throw new SupplierError('Proveedor no encontrado', 404);
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      isActive: !supplier.isActive,
    },
    include: {
      _count: {
        select: {
          products: true,
          purchases: true,
          streamingAccounts: true,
        },
      },
    },
  });

  return updated;
};
