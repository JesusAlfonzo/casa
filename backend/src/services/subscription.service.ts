import {
  Prisma,
  type Subscription,
  type SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateSubscriptionDTO,
  type UpdateSubscriptionDTO,
  type RenewSubscriptionDTO,
  type SubscriptionQueryDTO,
  type SubscriptionWithDetails,
  type PaginatedSubscriptionsResult,
  type SubscriptionStats,
} from '#types/subscription.types.js';

export class SubscriptionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SubscriptionError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador para parsear fecha.
 */
const parseDate = (val: string | Date | undefined, fieldName: string): Date => {
  if (!val) {
    throw new SubscriptionError(`El campo ${fieldName} es obligatorio`, 400);
  }
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    throw new SubscriptionError(
      `El campo ${fieldName} contiene una fecha inválida`,
      400
    );
  }
  return date;
};

/**
 * Validador para parsear importe decimal.
 */
const parseDecimal = (
  val: number | string | Prisma.Decimal,
  fieldName: string
): Prisma.Decimal => {
  try {
    const decimal = new Prisma.Decimal(val);
    if (decimal.isNegative()) {
      throw new SubscriptionError(
        `El campo ${fieldName} no puede ser un importe negativo`,
        400
      );
    }
    return decimal;
  } catch (error: any) {
    if (error instanceof SubscriptionError) throw error;
    throw new SubscriptionError(
      `El valor proporcionado para ${fieldName} no es un número válido`,
      400
    );
  }
};

/**
 * Generador automático de código de suscripción (ej: SUB-202610-A1B2).
 */
const generateSubscriptionCode = (): string => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SUB-${yearMonth}-${random}`;
};

/**
 * Registrar una nueva suscripción de cliente.
 */
export const createSubscription = async (
  dto: CreateSubscriptionDTO
): Promise<SubscriptionWithDetails> => {
  if (!dto.customerId) {
    throw new SubscriptionError('El cliente es obligatorio', 400);
  }

  if (!dto.serviceId) {
    throw new SubscriptionError('El servicio a suscribir es obligatorio', 400);
  }

  // 1. Validar cliente
  const customer = await prisma.customer.findUnique({
    where: { id: dto.customerId },
  });

  if (!customer || !customer.isActive || customer.deletedAt) {
    throw new SubscriptionError(
      'El cliente seleccionado no existe, está inactivo o fue eliminado',
      404
    );
  }

  // 2. Validar servicio
  const service = await prisma.service.findUnique({
    where: { id: dto.serviceId },
  });

  if (!service || !service.isActive) {
    throw new SubscriptionError(
      'El servicio seleccionado no existe o se encuentra inactivo',
      404
    );
  }

  // 3. Determinar precio pactado
  const agreedPrice =
    dto.agreedPrice !== undefined && dto.agreedPrice !== null
      ? parseDecimal(dto.agreedPrice, 'precio acordado')
      : service.basePrice;

  // 4. Determinar fechas de vigencia
  const startDate = dto.startDate
    ? parseDate(dto.startDate, 'fecha de inicio')
    : new Date();

  let expirationDate: Date;
  if (dto.expirationDate) {
    expirationDate = parseDate(dto.expirationDate, 'fecha de vencimiento');
  } else {
    const durationDays = dto.durationDays || service.defaultDurationDays || 30;
    expirationDate = new Date(startDate);
    expirationDate.setDate(expirationDate.getDate() + durationDays);
  }

  // 5. Determinar código único
  let code = dto.code?.trim().toUpperCase();
  if (code) {
    const existingCode = await prisma.subscription.findUnique({
      where: { code },
    });
    if (existingCode) {
      throw new SubscriptionError(
        `Ya existe una suscripción registrada con el código "${code}"`,
        409
      );
    }
  } else {
    code = generateSubscriptionCode();
  }

  // 6. Determinar estatus inicial
  const now = new Date();
  let status: SubscriptionStatus = dto.status || 'ACTIVE';
  if (!dto.status) {
    if (expirationDate < now) {
      status = 'EXPIRED';
    } else {
      const expiringThreshold = new Date(now);
      expiringThreshold.setDate(expiringThreshold.getDate() + 3);
      if (expirationDate <= expiringThreshold) {
        status = 'EXPIRING_SOON';
      } else {
        status = 'ACTIVE';
      }
    }
  }

  // 7. Validar y resolver asignación de cuenta/perfil de streaming
  let streamingAccountId = dto.streamingAccountId || null;
  let streamingProfileId = dto.streamingProfileId || null;

  if (streamingProfileId) {
    const profile = await prisma.streamingProfile.findUnique({
      where: { id: streamingProfileId },
      include: {
        streamingAccount: true,
        subscriptions: {
          where: {
            status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
          },
        },
      },
    });

    if (!profile) {
      throw new SubscriptionError(
        'El perfil de streaming especificado no existe',
        404
      );
    }

    if (profile.subscriptions.length > 0) {
      throw new SubscriptionError(
        `El perfil seleccionado (Pantalla ${profile.slotNumber} de ${profile.streamingAccount.accessEmail}) ya está ocupado por otra suscripción activa`,
        400
      );
    }

    streamingAccountId = profile.streamingAccountId;
  } else if (streamingAccountId) {
    const account = await prisma.streamingAccount.findUnique({
      where: { id: streamingAccountId },
      include: {
        profiles: {
          orderBy: { slotNumber: 'asc' },
        },
      },
    });

    if (!account) {
      throw new SubscriptionError(
        'La cuenta maestra de streaming especificada no existe',
        404
      );
    }

    // Si no es venta de cuenta completa, asignar automáticamente la primera pantalla disponible
    if (!service.isFullAccountSale) {
      const freeProfile = account.profiles.find((p) => !p.isOccupied);
      if (freeProfile) {
        streamingProfileId = freeProfile.id;
      } else {
        throw new SubscriptionError(
          `La cuenta ${account.accessEmail} no cuenta con pantallas libres disponibles`,
          400
        );
      }
    }
  }

  // 8. Ejecutar creación y actualización de perfiles en una transacción
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        code,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        streamingAccountId,
        streamingProfileId,
        agreedPrice,
        startDate,
        expirationDate,
        autoRenew: dto.autoRenew ?? true,
        status,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: true,
        service: true,
        streamingAccount: true,
        streamingProfile: true,
        _count: {
          select: { saleItems: true },
        },
      },
    });

    // Ocupar perfil y actualizar cuenta maestra si aplica
    if (streamingProfileId) {
      await tx.streamingProfile.update({
        where: { id: streamingProfileId },
        data: { isOccupied: true },
      });

      if (streamingAccountId) {
        const remainingProfiles = await tx.streamingProfile.findMany({
          where: { streamingAccountId },
        });
        const occupiedCount = remainingProfiles.filter(
          (p) => p.isOccupied
        ).length;
        const parentAccount = await tx.streamingAccount.findUnique({
          where: { id: streamingAccountId },
        });

        if (parentAccount) {
          const isFull = occupiedCount >= parentAccount.profileCapacity;
          await tx.streamingAccount.update({
            where: { id: streamingAccountId },
            data: {
              occupiedProfiles: occupiedCount,
              status: isFull ? 'FULL' : parentAccount.status,
            },
          });
        }
      }
    } else if (service.isFullAccountSale && streamingAccountId) {
      // Si se vendió la cuenta completa, marcar todas las pantallas como ocupadas y cuenta como FULL
      await tx.streamingProfile.updateMany({
        where: { streamingAccountId },
        data: { isOccupied: true },
      });

      const parentAccount = await tx.streamingAccount.findUnique({
        where: { id: streamingAccountId },
      });

      if (parentAccount) {
        await tx.streamingAccount.update({
          where: { id: streamingAccountId },
          data: {
            occupiedProfiles: parentAccount.profileCapacity,
            status: 'FULL',
          },
        });
      }
    }

    return subscription;
  });
};

/**
 * Listar suscripciones con filtros avanzados y paginación.
 */
export const getSubscriptions = async (
  query: SubscriptionQueryDTO
): Promise<PaginatedSubscriptionsResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.SubscriptionWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
      { service: { name: { contains: search, mode: 'insensitive' } } },
      { service: { code: { contains: search, mode: 'insensitive' } } },
      {
        streamingAccount: {
          accessEmail: { contains: search, mode: 'insensitive' },
        },
      },
    ];
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.serviceId) {
    where.serviceId = query.serviceId;
  }

  if (query.streamingAccountId) {
    where.streamingAccountId = query.streamingAccountId;
  }

  if (query.streamingProfileId) {
    where.streamingProfileId = query.streamingProfileId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.autoRenew !== undefined) {
    where.autoRenew =
      typeof query.autoRenew === 'string'
        ? query.autoRenew === 'true'
        : Boolean(query.autoRenew);
  }

  if (query.expiringBefore) {
    const date = new Date(query.expiringBefore);
    if (!isNaN(date.getTime())) {
      where.expirationDate = { lte: date };
    }
  }

  if (query.expiringWithinDays !== undefined) {
    const days = Number(query.expiringWithinDays);
    if (!isNaN(days) && days >= 0) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      where.expirationDate = {
        gte: new Date(),
        lte: targetDate,
      };
      where.status = { in: ['ACTIVE', 'EXPIRING_SOON'] };
    }
  }

  const validSortFields: Array<
    'expirationDate' | 'startDate' | 'createdAt' | 'agreedPrice' | 'code'
  > = ['expirationDate', 'startDate', 'createdAt', 'agreedPrice', 'code'];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'expirationDate';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: true,
        service: true,
        streamingAccount: true,
        streamingProfile: true,
        _count: {
          select: { saleItems: true },
        },
      },
    }),
    prisma.subscription.count({ where }),
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
 * Obtener detalle de una suscripción por ID.
 */
export const getSubscriptionById = async (
  id: string
): Promise<SubscriptionWithDetails> => {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      customer: true,
      service: true,
      streamingAccount: true,
      streamingProfile: true,
      _count: {
        select: { saleItems: true },
      },
    },
  });

  if (!subscription) {
    throw new SubscriptionError('La suscripción especificada no existe', 404);
  }

  return subscription;
};

/**
 * Renovar una suscripción extendiendo su fecha de vencimiento.
 */
export const renewSubscription = async (
  id: string,
  dto: RenewSubscriptionDTO
): Promise<SubscriptionWithDetails> => {
  const existing = await prisma.subscription.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!existing) {
    throw new SubscriptionError('La suscripción no existe', 404);
  }

  let newExpirationDate: Date;

  if (dto.newExpirationDate) {
    newExpirationDate = parseDate(
      dto.newExpirationDate,
      'nueva fecha de vencimiento'
    );
  } else {
    const daysToAdd = dto.days || existing.service.defaultDurationDays || 30;
    const now = new Date();
    // Si la suscripción ya venció, se renueva a partir de hoy; si aún no vence, a partir de su fecha actual
    const baseDate =
      existing.expirationDate > now ? existing.expirationDate : now;

    newExpirationDate = new Date(baseDate);
    newExpirationDate.setDate(newExpirationDate.getDate() + daysToAdd);
  }

  const data: Prisma.SubscriptionUpdateInput = {
    expirationDate: newExpirationDate,
    status: 'ACTIVE',
  };

  if (dto.agreedPrice !== undefined && dto.agreedPrice !== null) {
    data.agreedPrice = parseDecimal(dto.agreedPrice, 'precio acordado');
  }

  if (dto.notes !== undefined) {
    const previousNotes = existing.notes ? `${existing.notes}\n` : '';
    const nowStr = new Date().toISOString().split('T')[0];
    data.notes =
      `${previousNotes}[${nowStr}] Renovada hasta ${newExpirationDate.toISOString().split('T')[0]}: ${dto.notes?.trim() || ''}`.trim();
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data,
    include: {
      customer: true,
      service: true,
      streamingAccount: true,
      streamingProfile: true,
      _count: {
        select: { saleItems: true },
      },
    },
  });

  return updated;
};

/**
 * Actualizar datos de una suscripción y gestionar reasignaciones de perfiles.
 */
export const updateSubscription = async (
  id: string,
  dto: UpdateSubscriptionDTO
): Promise<SubscriptionWithDetails> => {
  const existing = await prisma.subscription.findUnique({
    where: { id },
    include: {
      service: true,
      streamingProfile: true,
      streamingAccount: true,
    },
  });

  if (!existing) {
    throw new SubscriptionError('La suscripción no existe', 404);
  }

  return await prisma.$transaction(async (tx) => {
    const data: Prisma.SubscriptionUpdateInput = {};

    // 1. Validar cliente si cambió
    if (
      dto.customerId !== undefined &&
      dto.customerId !== existing.customerId
    ) {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || !customer.isActive || customer.deletedAt) {
        throw new SubscriptionError(
          'El cliente especificado no existe o está inactivo',
          404
        );
      }
      data.customer = { connect: { id: dto.customerId } };
    }

    // 2. Validar servicio si cambió
    if (dto.serviceId !== undefined && dto.serviceId !== existing.serviceId) {
      const service = await tx.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (!service || !service.isActive) {
        throw new SubscriptionError(
          'El servicio especificado no existe o se encuentra inactivo',
          404
        );
      }
      data.service = { connect: { id: dto.serviceId } };
    }

    if (dto.agreedPrice !== undefined) {
      data.agreedPrice = parseDecimal(dto.agreedPrice, 'precio acordado');
    }

    if (dto.startDate !== undefined) {
      data.startDate = parseDate(dto.startDate, 'fecha de inicio');
    }

    if (dto.expirationDate !== undefined) {
      data.expirationDate = parseDate(
        dto.expirationDate,
        'fecha de vencimiento'
      );
    }

    if (dto.autoRenew !== undefined) {
      data.autoRenew = Boolean(dto.autoRenew);
    }

    if (dto.status !== undefined) {
      data.status = dto.status;

      // Si se cancela la suscripción, liberar el perfil y sincronizar cuenta
      if (dto.status === 'CANCELLED') {
        if (existing.streamingProfileId) {
          await tx.streamingProfile.update({
            where: { id: existing.streamingProfileId },
            data: { isOccupied: false },
          });

          if (existing.streamingAccountId) {
            const allProfiles = await tx.streamingProfile.findMany({
              where: { streamingAccountId: existing.streamingAccountId },
            });
            const occupied = allProfiles.filter(
              (p) => p.id !== existing.streamingProfileId && p.isOccupied
            ).length;

            const master = await tx.streamingAccount.findUnique({
              where: { id: existing.streamingAccountId },
            });
            if (master && master.status === 'FULL') {
              await tx.streamingAccount.update({
                where: { id: existing.streamingAccountId },
                data: { occupiedProfiles: occupied, status: 'AVAILABLE' },
              });
            }
          }
        }
      }
    }

    // 3. Gestión de reasignación de perfil
    if (
      dto.streamingProfileId !== undefined &&
      dto.streamingProfileId !== existing.streamingProfileId
    ) {
      // Liberar perfil anterior si tenía
      if (existing.streamingProfileId) {
        await tx.streamingProfile.update({
          where: { id: existing.streamingProfileId },
          data: { isOccupied: false },
        });
      }

      if (dto.streamingProfileId) {
        const newProfile = await tx.streamingProfile.findUnique({
          where: { id: dto.streamingProfileId },
          include: { streamingAccount: true },
        });

        if (!newProfile) {
          throw new SubscriptionError(
            'El nuevo perfil de streaming no existe',
            404
          );
        }

        // Marcar nuevo perfil como ocupado
        await tx.streamingProfile.update({
          where: { id: dto.streamingProfileId },
          data: { isOccupied: true },
        });

        data.streamingProfile = { connect: { id: dto.streamingProfileId } };
        data.streamingAccount = {
          connect: { id: newProfile.streamingAccountId },
        };
      } else {
        data.streamingProfile = { disconnect: true };
      }
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    const updated = await tx.subscription.update({
      where: { id },
      data,
      include: {
        customer: true,
        service: true,
        streamingAccount: true,
        streamingProfile: true,
        _count: {
          select: { saleItems: true },
        },
      },
    });

    return updated;
  });
};

/**
 * Eliminar una suscripción y liberar recursos asociados.
 */
export const deleteSubscription = async (id: string): Promise<Subscription> => {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      _count: {
        select: { saleItems: true },
      },
    },
  });

  if (!subscription) {
    throw new SubscriptionError('La suscripción no existe', 404);
  }

  if (subscription._count.saleItems > 0) {
    throw new SubscriptionError(
      `No se puede eliminar la suscripción porque tiene facturas/ventas asociadas (${subscription._count.saleItems}). Cambie su estado a CANCELLED en su lugar.`,
      400
    );
  }

  return await prisma.$transaction(async (tx) => {
    // Liberar perfil ocupado si lo tenía
    if (subscription.streamingProfileId) {
      await tx.streamingProfile.update({
        where: { id: subscription.streamingProfileId },
        data: { isOccupied: false },
      });

      if (subscription.streamingAccountId) {
        const allProfiles = await tx.streamingProfile.findMany({
          where: { streamingAccountId: subscription.streamingAccountId },
        });
        const occupied = allProfiles.filter(
          (p) => p.id !== subscription.streamingProfileId && p.isOccupied
        ).length;

        const master = await tx.streamingAccount.findUnique({
          where: { id: subscription.streamingAccountId },
        });

        if (master && master.status === 'FULL') {
          await tx.streamingAccount.update({
            where: { id: subscription.streamingAccountId },
            data: { occupiedProfiles: occupied, status: 'AVAILABLE' },
          });
        }
      }
    }

    return await tx.subscription.delete({
      where: { id },
    });
  });
};

/**
 * Estadísticas generales y métricas clave de suscripciones (MRR, estados, vencimientos).
 */
export const getSubscriptionStats = async (): Promise<SubscriptionStats> => {
  const [
    totalSubscriptions,
    activeSubscriptions,
    expiringSoonSubscriptions,
    expiredSubscriptions,
    suspendedSubscriptions,
    cancelledSubscriptions,
    activeWithPrices,
  ] = await Promise.all([
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'EXPIRING_SOON' } }),
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    prisma.subscription.count({ where: { status: 'SUSPENDED' } }),
    prisma.subscription.count({ where: { status: 'CANCELLED' } }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: { agreedPrice: true },
    }),
  ]);

  const monthlyRecurringRevenue = activeWithPrices.reduce(
    (sum, sub) => sum + Number(sub.agreedPrice),
    0
  );

  return {
    totalSubscriptions,
    activeSubscriptions,
    expiringSoonSubscriptions,
    expiredSubscriptions,
    suspendedSubscriptions,
    cancelledSubscriptions,
    monthlyRecurringRevenue: Number(monthlyRecurringRevenue.toFixed(2)),
  };
};
