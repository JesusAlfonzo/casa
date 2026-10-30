import {
  Prisma,
  type StreamingAccount,
  type StreamingProfile,
  type StreamingAccountStatus,
} from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateStreamingAccountDTO,
  type UpdateStreamingAccountDTO,
  type StreamingAccountQueryDTO,
  type StreamingAccountWithDetails,
  type PaginatedStreamingAccountsResult,
  type StreamingProfileWithDetails,
  type UpdateStreamingProfileDTO,
  type StreamingAccountStats,
} from '#types/streaming.types.js';

export class StreamingError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'StreamingError';
    this.statusCode = statusCode;
  }
}

/**
 * Validar o parsear fecha.
 */
const parseDate = (val: string | Date | undefined, fieldName: string): Date => {
  if (!val) {
    throw new StreamingError(`El campo ${fieldName} es obligatorio`, 400);
  }
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    throw new StreamingError(
      `El campo ${fieldName} contiene una fecha inválida`,
      400
    );
  }
  return date;
};

/**
 * Validar importe decimal.
 */
const parseDecimal = (
  val: number | string | Prisma.Decimal | null | undefined,
  fieldName: string
): Prisma.Decimal | null => {
  if (val === null || val === undefined || val === '') return null;
  try {
    const decimal = new Prisma.Decimal(val);
    if (decimal.isNegative()) {
      throw new StreamingError(
        `El campo ${fieldName} no puede ser un importe negativo`,
        400
      );
    }
    return decimal;
  } catch (error: any) {
    if (error instanceof StreamingError) throw error;
    throw new StreamingError(
      `El valor proporcionado para ${fieldName} no es un número válido`,
      400
    );
  }
};

// ============================================================================
// STREAMING ACCOUNT SERVICES
// ============================================================================

/**
 * Registrar una cuenta maestra de streaming y autogenerar sus perfiles/pantallas.
 */
export const createStreamingAccount = async (
  dto: CreateStreamingAccountDTO
): Promise<StreamingAccountWithDetails> => {
  // 1. Validaciones básicas de credenciales
  const accessEmail = dto.accessEmail?.trim().toLowerCase();
  if (!accessEmail) {
    throw new StreamingError(
      'El correo o usuario de acceso a la cuenta es obligatorio',
      400
    );
  }

  const accessPassword = dto.accessPassword?.trim();
  if (!accessPassword) {
    throw new StreamingError('La contraseña de acceso es obligatoria', 400);
  }

  if (!dto.serviceId) {
    throw new StreamingError(
      'El servicio al que pertenece la cuenta es obligatorio',
      400
    );
  }

  // 2. Validar existencia del servicio
  const service = await prisma.service.findUnique({
    where: { id: dto.serviceId },
  });

  if (!service || !service.isActive) {
    throw new StreamingError(
      'El servicio seleccionado no existe o se encuentra inactivo',
      404
    );
  }

  // 3. Validar proveedor si fue especificado
  if (dto.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier || !supplier.isActive) {
      throw new StreamingError(
        'El proveedor especificado no existe o se encuentra inactivo',
        404
      );
    }
  }

  // 4. Validar compra asociada si fue especificada
  if (dto.purchaseId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: dto.purchaseId },
    });
    if (!purchase) {
      throw new StreamingError('El registro de compra asociado no existe', 404);
    }
  }

  // 5. Validar capacidad de perfiles
  const capacity =
    dto.profileCapacity !== undefined ? Number(dto.profileCapacity) : 1;
  if (isNaN(capacity) || capacity < 1 || !Number.isInteger(capacity)) {
    throw new StreamingError(
      'La capacidad de perfiles debe ser un número entero mayor o igual a 1',
      400
    );
  }

  // 6. Validar fechas de suscripción con el proveedor
  const supplierCutoffDate = parseDate(
    dto.supplierCutoffDate,
    'fecha de corte con el proveedor'
  );
  const supplierStartDate = dto.supplierStartDate
    ? parseDate(dto.supplierStartDate, 'fecha de inicio con el proveedor')
    : new Date();

  const accountCost = parseDecimal(dto.accountCost, 'costo de la cuenta');

  // 7. Preparar perfiles iniciales
  const profileSlots: Array<{
    slotNumber: number;
    profileName: string | null;
    profilePin: string | null;
    isOccupied: boolean;
  }> = [];

  const providedProfiles = dto.profiles || [];
  let occupiedCount = 0;

  for (let i = 1; i <= capacity; i++) {
    const custom = providedProfiles.find((p) => p.slotNumber === i);
    const isOccupied = custom?.isOccupied ?? false;
    if (isOccupied) occupiedCount++;

    profileSlots.push({
      slotNumber: i,
      profileName: custom?.profileName?.trim() || `Pantalla ${i}`,
      profilePin: custom?.profilePin?.trim() || null,
      isOccupied,
    });
  }

  // 8. Determinar estatus inicial
  let initialStatus: StreamingAccountStatus = dto.status || 'AVAILABLE';
  const now = new Date();
  if (supplierCutoffDate < now) {
    initialStatus = 'EXPIRED';
  } else if (!dto.status) {
    if (occupiedCount >= capacity) {
      initialStatus = 'FULL';
    } else {
      initialStatus = 'AVAILABLE';
    }
  }

  // 9. Ejecutar creación atómica con Prisma Transaction
  return await prisma.$transaction(async (tx) => {
    const account = await tx.streamingAccount.create({
      data: {
        serviceId: dto.serviceId,
        supplierId: dto.supplierId || null,
        purchaseId: dto.purchaseId || null,
        accessEmail,
        accessPassword,
        securityPin: dto.securityPin?.trim() || null,
        profileCapacity: capacity,
        occupiedProfiles: occupiedCount,
        accountCost,
        supplierStartDate,
        supplierCutoffDate,
        status: initialStatus,
        notes: dto.notes?.trim() || null,
        profiles: {
          create: profileSlots,
        },
      },
      include: {
        service: true,
        supplier: true,
        purchase: true,
        profiles: {
          orderBy: { slotNumber: 'asc' },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return account;
  });
};

/**
 * Listar cuentas maestras de streaming con filtros y paginación.
 */
export const getStreamingAccounts = async (
  query: StreamingAccountQueryDTO
): Promise<PaginatedStreamingAccountsResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.StreamingAccountWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { accessEmail: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { service: { name: { contains: search, mode: 'insensitive' } } },
      { service: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (query.serviceId) {
    where.serviceId = query.serviceId;
  }

  if (query.supplierId) {
    where.supplierId = query.supplierId;
  }

  if (query.purchaseId) {
    where.purchaseId = query.purchaseId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.expiringBefore) {
    const date = new Date(query.expiringBefore);
    if (!isNaN(date.getTime())) {
      where.supplierCutoffDate = { lte: date };
    }
  }

  if (query.expiringWithinDays !== undefined) {
    const days = Number(query.expiringWithinDays);
    if (!isNaN(days) && days >= 0) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      where.supplierCutoffDate = {
        gte: new Date(),
        lte: targetDate,
      };
    }
  }

  if (query.hasAvailableProfiles !== undefined) {
    const hasAvailable =
      typeof query.hasAvailableProfiles === 'string'
        ? query.hasAvailableProfiles === 'true'
        : Boolean(query.hasAvailableProfiles);

    if (hasAvailable) {
      where.status = 'AVAILABLE';
    }
  }

  const validSortFields: Array<
    | 'supplierCutoffDate'
    | 'createdAt'
    | 'accessEmail'
    | 'profileCapacity'
    | 'occupiedProfiles'
  > = [
    'supplierCutoffDate',
    'createdAt',
    'accessEmail',
    'profileCapacity',
    'occupiedProfiles',
  ];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'supplierCutoffDate';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [items, total] = await Promise.all([
    prisma.streamingAccount.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        service: true,
        supplier: true,
        purchase: true,
        profiles: {
          orderBy: { slotNumber: 'asc' },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    }),
    prisma.streamingAccount.count({ where }),
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
 * Obtener detalle de una cuenta de streaming por ID con sus perfiles ordenados.
 */
export const getStreamingAccountById = async (
  id: string
): Promise<StreamingAccountWithDetails> => {
  const account = await prisma.streamingAccount.findUnique({
    where: { id },
    include: {
      service: true,
      supplier: true,
      purchase: true,
      profiles: {
        orderBy: { slotNumber: 'asc' },
      },
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  if (!account) {
    throw new StreamingError('La cuenta de streaming no existe', 404);
  }

  return account;
};

/**
 * Actualizar datos de la cuenta de streaming y sincronizar capacidad de perfiles.
 */
export const updateStreamingAccount = async (
  id: string,
  dto: UpdateStreamingAccountDTO
): Promise<StreamingAccountWithDetails> => {
  const existing = await prisma.streamingAccount.findUnique({
    where: { id },
    include: {
      profiles: {
        orderBy: { slotNumber: 'asc' },
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new StreamingError('La cuenta de streaming no existe', 404);
  }

  // Validaciones
  if (dto.serviceId !== undefined) {
    const service = await prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service || !service.isActive) {
      throw new StreamingError(
        'El servicio especificado no existe o se encuentra inactivo',
        404
      );
    }
  }

  if (dto.supplierId !== undefined && dto.supplierId !== null) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier || !supplier.isActive) {
      throw new StreamingError(
        'El proveedor especificado no existe o se encuentra inactivo',
        404
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    let newCapacity = existing.profileCapacity;

    if (dto.profileCapacity !== undefined) {
      const cap = Number(dto.profileCapacity);
      if (isNaN(cap) || cap < 1 || !Number.isInteger(cap)) {
        throw new StreamingError(
          'La capacidad de perfiles debe ser un número entero mayor o igual a 1',
          400
        );
      }
      newCapacity = cap;

      // Si la capacidad disminuye, verificar perfiles a remover
      if (newCapacity < existing.profileCapacity) {
        const profilesToRemove = existing.profiles.filter(
          (p) => p.slotNumber > newCapacity
        );

        const hasOccupiedOrSubscribed = profilesToRemove.some(
          (p) => p.isOccupied || p._count.subscriptions > 0
        );

        if (hasOccupiedOrSubscribed) {
          throw new StreamingError(
            `No se puede reducir la capacidad a ${newCapacity} porque los perfiles que se eliminarían (ranuras ${newCapacity + 1} a ${existing.profileCapacity}) están ocupados o tienen suscripciones vinculadas`,
            400
          );
        }

        // Eliminar perfiles excedentes
        await tx.streamingProfile.deleteMany({
          where: {
            streamingAccountId: id,
            slotNumber: { gt: newCapacity },
          },
        });
      } else if (newCapacity > existing.profileCapacity) {
        // Generar nuevos perfiles para las nuevas ranuras
        const newSlots: Array<{
          streamingAccountId: string;
          slotNumber: number;
          profileName: string;
          isOccupied: boolean;
        }> = [];

        for (let s = existing.profileCapacity + 1; s <= newCapacity; s++) {
          newSlots.push({
            streamingAccountId: id,
            slotNumber: s,
            profileName: `Pantalla ${s}`,
            isOccupied: false,
          });
        }

        await tx.streamingProfile.createMany({
          data: newSlots,
        });
      }
    }

    // Recalcular perfiles ocupados actuales
    const remainingProfiles = await tx.streamingProfile.findMany({
      where: { streamingAccountId: id },
    });

    const occupiedProfiles = remainingProfiles.filter(
      (p) => p.isOccupied
    ).length;

    // Determinar nuevo estado
    let status = dto.status || existing.status;
    const cutoffDate = dto.supplierCutoffDate
      ? parseDate(dto.supplierCutoffDate, 'fecha de corte con proveedor')
      : existing.supplierCutoffDate;

    if (cutoffDate < new Date()) {
      status = 'EXPIRED';
    } else if (
      dto.status === undefined &&
      (existing.status === 'AVAILABLE' || existing.status === 'FULL')
    ) {
      status = occupiedProfiles >= newCapacity ? 'FULL' : 'AVAILABLE';
    }

    const data: Prisma.StreamingAccountUpdateInput = {
      profileCapacity: newCapacity,
      occupiedProfiles,
      status,
    };

    if (dto.serviceId !== undefined) {
      data.service = { connect: { id: dto.serviceId } };
    }
    if (dto.supplierId !== undefined) {
      data.supplier = dto.supplierId
        ? { connect: { id: dto.supplierId } }
        : { disconnect: true };
    }
    if (dto.purchaseId !== undefined) {
      data.purchase = dto.purchaseId
        ? { connect: { id: dto.purchaseId } }
        : { disconnect: true };
    }
    if (dto.accessEmail !== undefined) {
      const email = dto.accessEmail.trim().toLowerCase();
      if (!email) {
        throw new StreamingError(
          'El correo de acceso no puede estar vacío',
          400
        );
      }
      data.accessEmail = email;
    }
    if (dto.accessPassword !== undefined) {
      const pass = dto.accessPassword.trim();
      if (!pass) {
        throw new StreamingError(
          'La contraseña de acceso no puede estar vacía',
          400
        );
      }
      data.accessPassword = pass;
    }
    if (dto.securityPin !== undefined) {
      data.securityPin = dto.securityPin?.trim() || null;
    }
    if (dto.accountCost !== undefined) {
      data.accountCost = parseDecimal(dto.accountCost, 'costo de la cuenta');
    }
    if (dto.supplierStartDate !== undefined) {
      data.supplierStartDate = parseDate(
        dto.supplierStartDate,
        'fecha de inicio'
      );
    }
    if (dto.supplierCutoffDate !== undefined) {
      data.supplierCutoffDate = cutoffDate;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    const updated = await tx.streamingAccount.update({
      where: { id },
      data,
      include: {
        service: true,
        supplier: true,
        purchase: true,
        profiles: {
          orderBy: { slotNumber: 'asc' },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return updated;
  });
};

/**
 * Eliminar una cuenta de streaming si no tiene suscripciones asociadas.
 */
export const deleteStreamingAccount = async (
  id: string
): Promise<StreamingAccount> => {
  const account = await prisma.streamingAccount.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
      profiles: {
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      },
    },
  });

  if (!account) {
    throw new StreamingError('La cuenta de streaming no existe', 404);
  }

  const profileSubscriptionsCount = account.profiles.reduce(
    (acc, p) => acc + p._count.subscriptions,
    0
  );

  const totalSubscriptions =
    account._count.subscriptions + profileSubscriptionsCount;

  if (totalSubscriptions > 0) {
    throw new StreamingError(
      `No se puede eliminar la cuenta de streaming porque tiene ${totalSubscriptions} suscripción(es) asociada(s). Considere cambiar su estado a SUSPENDIDA o DESACTIVADA.`,
      400
    );
  }

  return prisma.streamingAccount.delete({
    where: { id },
  });
};

/**
 * Obtener estadísticas globales del parque de cuentas de streaming.
 */
export const getStreamingAccountStats =
  async (): Promise<StreamingAccountStats> => {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const [
      totalAccounts,
      availableAccounts,
      fullAccounts,
      expiredAccounts,
      downSupportAccounts,
      suspendedAccounts,
      aggregations,
      expiringSoonCount,
    ] = await Promise.all([
      prisma.streamingAccount.count(),
      prisma.streamingAccount.count({ where: { status: 'AVAILABLE' } }),
      prisma.streamingAccount.count({ where: { status: 'FULL' } }),
      prisma.streamingAccount.count({ where: { status: 'EXPIRED' } }),
      prisma.streamingAccount.count({ where: { status: 'DOWN_SUPPORT' } }),
      prisma.streamingAccount.count({ where: { status: 'SUSPENDED' } }),
      prisma.streamingAccount.aggregate({
        _sum: {
          profileCapacity: true,
          occupiedProfiles: true,
        },
      }),
      prisma.streamingAccount.count({
        where: {
          supplierCutoffDate: {
            gte: now,
            lte: next7Days,
          },
          status: { in: ['AVAILABLE', 'FULL'] },
        },
      }),
    ]);

    return {
      totalAccounts,
      availableAccounts,
      fullAccounts,
      expiredAccounts,
      downSupportAccounts,
      suspendedAccounts,
      totalCapacity: aggregations._sum.profileCapacity || 0,
      totalOccupiedProfiles: aggregations._sum.occupiedProfiles || 0,
      expiringSoonCount,
    };
  };

// ============================================================================
// STREAMING PROFILE SERVICES
// ============================================================================

/**
 * Listar perfiles pertenecientes a una cuenta de streaming.
 */
export const getProfilesByAccountId = async (
  streamingAccountId: string
): Promise<StreamingProfileWithDetails[]> => {
  const accountExists = await prisma.streamingAccount.findUnique({
    where: { id: streamingAccountId },
  });

  if (!accountExists) {
    throw new StreamingError('La cuenta de streaming no existe', 404);
  }

  return prisma.streamingProfile.findMany({
    where: { streamingAccountId },
    orderBy: { slotNumber: 'asc' },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
};

/**
 * Obtener detalle de un perfil individual por ID.
 */
export const getProfileById = async (
  id: string
): Promise<StreamingProfileWithDetails> => {
  const profile = await prisma.streamingProfile.findUnique({
    where: { id },
    include: {
      streamingAccount: {
        select: {
          id: true,
          accessEmail: true,
          status: true,
          supplierCutoffDate: true,
          service: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  if (!profile) {
    throw new StreamingError('El perfil de streaming no existe', 404);
  }

  return profile;
};

/**
 * Actualizar un perfil (nombre, pin, estado ocupado) y sincronizar cuenta padre.
 */
export const updateStreamingProfile = async (
  id: string,
  dto: UpdateStreamingProfileDTO
): Promise<StreamingProfileWithDetails> => {
  const existing = await prisma.streamingProfile.findUnique({
    where: { id },
    include: { streamingAccount: true },
  });

  if (!existing) {
    throw new StreamingError('El perfil de streaming no existe', 404);
  }

  return await prisma.$transaction(async (tx) => {
    const data: Prisma.StreamingProfileUpdateInput = {};

    if (dto.profileName !== undefined) {
      data.profileName = dto.profileName?.trim() || null;
    }
    if (dto.profilePin !== undefined) {
      data.profilePin = dto.profilePin?.trim() || null;
    }
    if (dto.isOccupied !== undefined) {
      data.isOccupied = Boolean(dto.isOccupied);
    }

    const updatedProfile = await tx.streamingProfile.update({
      where: { id },
      data,
      include: {
        streamingAccount: {
          select: {
            id: true,
            accessEmail: true,
            status: true,
            supplierCutoffDate: true,
            service: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    // Si cambió el estado de ocupado, sincronizar la cuenta maestra
    if (
      dto.isOccupied !== undefined &&
      dto.isOccupied !== existing.isOccupied
    ) {
      const allProfiles = await tx.streamingProfile.findMany({
        where: { streamingAccountId: existing.streamingAccountId },
      });

      const occupiedCount = allProfiles.filter((p) => p.isOccupied).length;
      const account = existing.streamingAccount;

      let newStatus = account.status;
      if (account.status === 'AVAILABLE' || account.status === 'FULL') {
        newStatus =
          occupiedCount >= account.profileCapacity ? 'FULL' : 'AVAILABLE';
      }

      await tx.streamingAccount.update({
        where: { id: existing.streamingAccountId },
        data: {
          occupiedProfiles: occupiedCount,
          status: newStatus,
        },
      });
    }

    return updatedProfile;
  });
};

/**
 * Alternar u ordenar explícitamente el estado de ocupación de un perfil.
 */
export const toggleProfileOccupied = async (
  id: string,
  isOccupied?: boolean
): Promise<StreamingProfileWithDetails> => {
  const existing = await prisma.streamingProfile.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new StreamingError('El perfil de streaming no existe', 404);
  }

  const targetState =
    isOccupied !== undefined ? Boolean(isOccupied) : !existing.isOccupied;

  return updateStreamingProfile(id, { isOccupied: targetState });
};
