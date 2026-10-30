import { Prisma, type Customer } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateCustomerDTO,
  type UpdateCustomerDTO,
  type CustomerQueryDTO,
  type CustomerWithDetails,
  type PaginatedCustomersResult,
} from '#types/customer.types.js';

export class CustomerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'CustomerError';
    this.statusCode = statusCode;
  }
}

/**
 * Normalizar documento de identidad o campo opcional único.
 */
const cleanDocumentId = (doc?: string | null): string | null => {
  if (!doc) return null;
  const cleaned = doc.trim();
  return cleaned.length > 0 ? cleaned : null;
};

/**
 * Registrar un nuevo cliente.
 */
export const createCustomer = async (
  dto: CreateCustomerDTO
): Promise<CustomerWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new CustomerError('El nombre del cliente es obligatorio', 400);
  }

  const documentId = cleanDocumentId(dto.documentId);
  if (documentId) {
    const existingDoc = await prisma.customer.findUnique({
      where: { documentId },
    });
    if (existingDoc) {
      throw new CustomerError(
        `Ya existe un cliente registrado con el documento de identidad "${documentId}"`,
        409
      );
    }
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      lastName: dto.lastName?.trim() || null,
      documentId,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      address: dto.address?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: {
          sales: true,
          subscriptions: true,
        },
      },
    },
  });

  return customer;
};

/**
 * Listar clientes con filtros, búsqueda y paginación.
 */
export const getCustomers = async (
  query: CustomerQueryDTO
): Promise<PaginatedCustomersResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {};

  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { documentId: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.phone?.trim()) {
    where.phone = { contains: query.phone.trim(), mode: 'insensitive' };
  }

  if (query.documentId?.trim()) {
    where.documentId = {
      contains: query.documentId.trim(),
      mode: 'insensitive',
    };
  }

  if (query.email?.trim()) {
    where.email = { contains: query.email.trim(), mode: 'insensitive' };
  }

  if (query.isActive !== undefined) {
    where.isActive =
      typeof query.isActive === 'string'
        ? query.isActive === 'true'
        : Boolean(query.isActive);
  }

  const validSortFields: Array<
    'name' | 'lastName' | 'createdAt' | 'updatedAt'
  > = ['name', 'lastName', 'createdAt', 'updatedAt'];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'name';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            sales: true,
            subscriptions: true,
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Obtener detalle de un cliente por ID junto con sus suscripciones activas.
 */
export const getCustomerById = async (
  id: string
): Promise<CustomerWithDetails> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      subscriptions: {
        where: {
          status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        },
        include: {
          service: true,
          streamingAccount: {
            select: {
              id: true,
              accessEmail: true,
              supplierCutoffDate: true,
            },
          },
          streamingProfile: {
            select: {
              id: true,
              slotNumber: true,
              profileName: true,
              profilePin: true,
            },
          },
        },
      },
      _count: {
        select: {
          sales: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!customer) {
    throw new CustomerError('El cliente especificado no existe', 404);
  }

  return customer;
};

/**
 * Actualizar los datos de un cliente.
 */
export const updateCustomer = async (
  id: string,
  dto: UpdateCustomerDTO
): Promise<CustomerWithDetails> => {
  const existing = await prisma.customer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new CustomerError('El cliente no existe', 404);
  }

  const data: Prisma.CustomerUpdateInput = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();
    if (!name) {
      throw new CustomerError(
        'El nombre del cliente no puede estar vacío',
        400
      );
    }
    data.name = name;
  }

  if (dto.lastName !== undefined) {
    data.lastName = dto.lastName?.trim() || null;
  }

  if (dto.documentId !== undefined) {
    const documentId = cleanDocumentId(dto.documentId);
    if (documentId && documentId !== existing.documentId) {
      const duplicate = await prisma.customer.findUnique({
        where: { documentId },
      });
      if (duplicate) {
        throw new CustomerError(
          `Ya existe otro cliente con el documento "${documentId}"`,
          409
        );
      }
    }
    data.documentId = documentId;
  }

  if (dto.phone !== undefined) {
    data.phone = dto.phone?.trim() || null;
  }

  if (dto.email !== undefined) {
    data.email = dto.email?.trim().toLowerCase() || null;
  }

  if (dto.address !== undefined) {
    data.address = dto.address?.trim() || null;
  }

  if (dto.notes !== undefined) {
    data.notes = dto.notes?.trim() || null;
  }

  if (dto.isActive !== undefined) {
    data.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          sales: true,
          subscriptions: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Alternar estado activo/inactivo de un cliente.
 */
export const toggleCustomerStatus = async (
  id: string
): Promise<CustomerWithDetails> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw new CustomerError('El cliente no existe', 404);
  }

  return prisma.customer.update({
    where: { id },
    data: { isActive: !customer.isActive },
    include: {
      _count: {
        select: {
          sales: true,
          subscriptions: true,
        },
      },
    },
  });
};

/**
 * Eliminar un cliente. Si posee ventas o suscripciones, realiza borrado lógico (soft-delete).
 */
export const deleteCustomer = async (
  id: string
): Promise<{ customer: Customer; isSoftDeleted: boolean }> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!customer) {
    throw new CustomerError('El cliente no existe', 404);
  }

  const hasHistory =
    customer._count.sales > 0 || customer._count.subscriptions > 0;

  if (hasHistory) {
    // Borrado lógico para preservar integridad referencial y financiera
    const softDeleted = await prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { customer: softDeleted, isSoftDeleted: true };
  }

  // Borrado físico si no tiene ningún registro asociado
  const deleted = await prisma.customer.delete({
    where: { id },
  });

  return { customer: deleted, isSoftDeleted: false };
};
