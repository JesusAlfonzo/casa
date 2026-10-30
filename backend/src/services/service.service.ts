import { Prisma, type Service, type ServiceType } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateServiceTypeDTO,
  type UpdateServiceTypeDTO,
  type ServiceTypeQueryDTO,
  type ServiceTypeWithDetails,
  type PaginatedServiceTypesResult,
  type CreateServiceDTO,
  type UpdateServiceDTO,
  type ServiceQueryDTO,
  type ServiceWithDetails,
  type PaginatedServicesResult,
} from '#types/service.types.js';

export class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador para importes numéricos decimales.
 */
const parseDecimal = (
  value: number | string | Prisma.Decimal,
  fieldName: string
): Prisma.Decimal => {
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative()) {
      throw new ServiceError(
        `El campo ${fieldName} no puede ser un valor negativo`,
        400
      );
    }
    return decimal;
  } catch (error: any) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      `El valor proporcionado para ${fieldName} no es un número válido`,
      400
    );
  }
};

/**
 * Generador automático de código único para el servicio en caso de no ser provisto.
 */
const generateServiceCode = (name: string): string => {
  const prefix =
    name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'SRV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SRV-${prefix}-${timestamp}-${random}`;
};

// ============================================================================
// SERVICETYPE SERVICES
// ============================================================================

/**
 * Crear un nuevo tipo de servicio (ej: Streaming de Video, Música, Software).
 */
export const createServiceType = async (
  dto: CreateServiceTypeDTO
): Promise<ServiceTypeWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new ServiceError(
      'El nombre del tipo de servicio es obligatorio',
      400
    );
  }

  const existing = await prisma.serviceType.findUnique({
    where: { name },
  });
  if (existing) {
    throw new ServiceError(
      `Ya existe un tipo de servicio con el nombre "${name}"`,
      409
    );
  }

  const serviceType = await prisma.serviceType.create({
    data: {
      name,
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: { services: true },
      },
    },
  });

  return serviceType;
};

/**
 * Listar tipos de servicio con filtros y paginación.
 */
export const getServiceTypes = async (
  query: ServiceTypeQueryDTO
): Promise<PaginatedServiceTypesResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ServiceTypeWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.isActive !== undefined) {
    where.isActive =
      typeof query.isActive === 'string'
        ? query.isActive === 'true'
        : Boolean(query.isActive);
  }

  const validSortFields: Array<'name' | 'createdAt' | 'updatedAt'> = [
    'name',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as 'name' | 'createdAt' | 'updatedAt')
    : 'name';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [items, total] = await Promise.all([
    prisma.serviceType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { services: true },
        },
      },
    }),
    prisma.serviceType.count({ where }),
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
 * Obtener un tipo de servicio por ID.
 */
export const getServiceTypeById = async (
  id: string
): Promise<ServiceTypeWithDetails> => {
  const serviceType = await prisma.serviceType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { services: true },
      },
    },
  });

  if (!serviceType) {
    throw new ServiceError('El tipo de servicio especificado no existe', 404);
  }

  return serviceType;
};

/**
 * Actualizar un tipo de servicio.
 */
export const updateServiceType = async (
  id: string,
  dto: UpdateServiceTypeDTO
): Promise<ServiceTypeWithDetails> => {
  const existing = await prisma.serviceType.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ServiceError('El tipo de servicio no existe', 404);
  }

  const data: Prisma.ServiceTypeUpdateInput = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();
    if (!name) {
      throw new ServiceError(
        'El nombre del tipo de servicio no puede estar vacío',
        400
      );
    }

    if (name !== existing.name) {
      const duplicate = await prisma.serviceType.findUnique({
        where: { name },
      });
      if (duplicate) {
        throw new ServiceError(
          `Ya existe otro tipo de servicio con el nombre "${name}"`,
          409
        );
      }
    }
    data.name = name;
  }

  if (dto.description !== undefined) {
    data.description = dto.description?.trim() || null;
  }

  if (dto.isActive !== undefined) {
    data.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.serviceType.update({
    where: { id },
    data,
    include: {
      _count: {
        select: { services: true },
      },
    },
  });

  return updated;
};

/**
 * Alternar estado activo/inactivo de un tipo de servicio.
 */
export const toggleServiceTypeStatus = async (
  id: string
): Promise<ServiceTypeWithDetails> => {
  const serviceType = await prisma.serviceType.findUnique({
    where: { id },
  });

  if (!serviceType) {
    throw new ServiceError('El tipo de servicio no existe', 404);
  }

  return prisma.serviceType.update({
    where: { id },
    data: { isActive: !serviceType.isActive },
    include: {
      _count: {
        select: { services: true },
      },
    },
  });
};

/**
 * Eliminar un tipo de servicio si no tiene servicios asociados.
 */
export const deleteServiceType = async (id: string): Promise<ServiceType> => {
  const serviceType = await prisma.serviceType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { services: true },
      },
    },
  });

  if (!serviceType) {
    throw new ServiceError('El tipo de servicio no existe', 404);
  }

  if (serviceType._count.services > 0) {
    throw new ServiceError(
      `No se puede eliminar el tipo de servicio porque tiene ${serviceType._count.services} servicio(s) asociado(s). Desactívelo en su lugar.`,
      400
    );
  }

  return prisma.serviceType.delete({
    where: { id },
  });
};

// ============================================================================
// SERVICE (CATALOG) SERVICES
// ============================================================================

/**
 * Registrar un nuevo servicio en el catálogo.
 */
export const createService = async (
  dto: CreateServiceDTO
): Promise<ServiceWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new ServiceError('El nombre del servicio es obligatorio', 400);
  }

  if (!dto.serviceTypeId) {
    throw new ServiceError('El tipo de servicio es obligatorio', 400);
  }

  // 1. Validar existencia del tipo de servicio
  const serviceType = await prisma.serviceType.findUnique({
    where: { id: dto.serviceTypeId },
  });

  if (!serviceType || !serviceType.isActive) {
    throw new ServiceError(
      'El tipo de servicio especificado no existe o se encuentra inactivo',
      404
    );
  }

  // 2. Validar o autogenerar código
  let code = dto.code?.trim().toUpperCase();
  if (code) {
    const existingCode = await prisma.service.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new ServiceError(
        `Ya existe un servicio registrado con el código "${code}"`,
        409
      );
    }
  } else {
    code = generateServiceCode(name);
  }

  // 3. Validar precio base
  if (dto.basePrice === undefined || dto.basePrice === null) {
    throw new ServiceError('El precio base del servicio es obligatorio', 400);
  }
  const basePrice = parseDecimal(dto.basePrice, 'precio base');

  // 4. Validar días de duración si es servicio recurrente
  let defaultDurationDays: number | null = 30;
  if (dto.defaultDurationDays !== undefined) {
    if (dto.defaultDurationDays === null) {
      defaultDurationDays = null;
    } else {
      const parsedDays = Number(dto.defaultDurationDays);
      if (isNaN(parsedDays) || parsedDays <= 0) {
        throw new ServiceError(
          'La duración por defecto en días debe ser un número entero positivo',
          400
        );
      }
      defaultDurationDays = Math.floor(parsedDays);
    }
  }

  const service = await prisma.service.create({
    data: {
      code,
      name,
      description: dto.description?.trim() || null,
      serviceTypeId: dto.serviceTypeId,
      basePrice,
      defaultDurationDays,
      requiresStreamingAccount: Boolean(dto.requiresStreamingAccount),
      isFullAccountSale: Boolean(dto.isFullAccountSale),
      isActive: dto.isActive ?? true,
    },
    include: {
      serviceType: true,
      _count: {
        select: {
          streamingAccounts: true,
          subscriptions: true,
          purchaseItems: true,
          saleItems: true,
        },
      },
    },
  });

  return service;
};

/**
 * Listar servicios del catálogo con filtros y paginación.
 */
export const getServices = async (
  query: ServiceQueryDTO
): Promise<PaginatedServicesResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ServiceWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.serviceTypeId) {
    where.serviceTypeId = query.serviceTypeId;
  }

  if (query.requiresStreamingAccount !== undefined) {
    where.requiresStreamingAccount =
      typeof query.requiresStreamingAccount === 'string'
        ? query.requiresStreamingAccount === 'true'
        : Boolean(query.requiresStreamingAccount);
  }

  if (query.isFullAccountSale !== undefined) {
    where.isFullAccountSale =
      typeof query.isFullAccountSale === 'string'
        ? query.isFullAccountSale === 'true'
        : Boolean(query.isFullAccountSale);
  }

  if (query.isActive !== undefined) {
    where.isActive =
      typeof query.isActive === 'string'
        ? query.isActive === 'true'
        : Boolean(query.isActive);
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.basePrice = {};
    if (query.minPrice !== undefined) {
      where.basePrice.gte = new Prisma.Decimal(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.basePrice.lte = new Prisma.Decimal(query.maxPrice);
    }
  }

  const validSortFields: Array<
    | 'name'
    | 'code'
    | 'basePrice'
    | 'defaultDurationDays'
    | 'createdAt'
    | 'updatedAt'
  > = [
    'name',
    'code',
    'basePrice',
    'defaultDurationDays',
    'createdAt',
    'updatedAt',
  ];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'name';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        serviceType: true,
        _count: {
          select: {
            streamingAccounts: true,
            subscriptions: true,
            purchaseItems: true,
            saleItems: true,
          },
        },
      },
    }),
    prisma.service.count({ where }),
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
 * Obtener un servicio por ID.
 */
export const getServiceById = async (
  id: string
): Promise<ServiceWithDetails> => {
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      serviceType: true,
      _count: {
        select: {
          streamingAccounts: true,
          subscriptions: true,
          purchaseItems: true,
          saleItems: true,
        },
      },
    },
  });

  if (!service) {
    throw new ServiceError('El servicio especificado no existe', 404);
  }

  return service;
};

/**
 * Actualizar información de un servicio.
 */
export const updateService = async (
  id: string,
  dto: UpdateServiceDTO
): Promise<ServiceWithDetails> => {
  const existing = await prisma.service.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ServiceError('El servicio no existe', 404);
  }

  const data: Prisma.ServiceUpdateInput = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();
    if (!name) {
      throw new ServiceError(
        'El nombre del servicio no puede estar vacío',
        400
      );
    }
    data.name = name;
  }

  if (dto.code !== undefined) {
    const code = dto.code.trim().toUpperCase();
    if (!code) {
      throw new ServiceError(
        'El código del servicio no puede estar vacío',
        400
      );
    }
    if (code !== existing.code) {
      const duplicate = await prisma.service.findUnique({
        where: { code },
      });
      if (duplicate) {
        throw new ServiceError(
          `Ya existe otro servicio con el código "${code}"`,
          409
        );
      }
    }
    data.code = code;
  }

  if (dto.description !== undefined) {
    data.description = dto.description?.trim() || null;
  }

  if (dto.serviceTypeId !== undefined) {
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType || !serviceType.isActive) {
      throw new ServiceError(
        'El tipo de servicio especificado no existe o se encuentra inactivo',
        404
      );
    }
    data.serviceType = { connect: { id: dto.serviceTypeId } };
  }

  if (dto.basePrice !== undefined) {
    data.basePrice = parseDecimal(dto.basePrice, 'precio base');
  }

  if (dto.defaultDurationDays !== undefined) {
    if (dto.defaultDurationDays === null) {
      data.defaultDurationDays = null;
    } else {
      const parsedDays = Number(dto.defaultDurationDays);
      if (isNaN(parsedDays) || parsedDays <= 0) {
        throw new ServiceError(
          'La duración por defecto debe ser un número entero positivo',
          400
        );
      }
      data.defaultDurationDays = Math.floor(parsedDays);
    }
  }

  if (dto.requiresStreamingAccount !== undefined) {
    data.requiresStreamingAccount = Boolean(dto.requiresStreamingAccount);
  }

  if (dto.isFullAccountSale !== undefined) {
    data.isFullAccountSale = Boolean(dto.isFullAccountSale);
  }

  if (dto.isActive !== undefined) {
    data.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.service.update({
    where: { id },
    data,
    include: {
      serviceType: true,
      _count: {
        select: {
          streamingAccounts: true,
          subscriptions: true,
          purchaseItems: true,
          saleItems: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Alternar estado activo/inactivo de un servicio.
 */
export const toggleServiceStatus = async (
  id: string
): Promise<ServiceWithDetails> => {
  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    throw new ServiceError('El servicio no existe', 404);
  }

  return prisma.service.update({
    where: { id },
    data: { isActive: !service.isActive },
    include: {
      serviceType: true,
      _count: {
        select: {
          streamingAccounts: true,
          subscriptions: true,
          purchaseItems: true,
          saleItems: true,
        },
      },
    },
  });
};

/**
 * Eliminar un servicio si no cuenta con movimientos o cuentas vinculadas.
 */
export const deleteService = async (id: string): Promise<Service> => {
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          streamingAccounts: true,
          subscriptions: true,
          purchaseItems: true,
          saleItems: true,
        },
      },
    },
  });

  if (!service) {
    throw new ServiceError('El servicio no existe', 404);
  }

  const totalLinked =
    service._count.streamingAccounts +
    service._count.subscriptions +
    service._count.purchaseItems +
    service._count.saleItems;

  if (totalLinked > 0) {
    throw new ServiceError(
      `No se puede eliminar el servicio porque posee historial vinculado (${service._count.streamingAccounts} cuentas maestras, ${service._count.subscriptions} suscripciones, ${service._count.saleItems} ventas). Desactívelo en su lugar.`,
      400
    );
  }

  return prisma.service.delete({
    where: { id },
  });
};
