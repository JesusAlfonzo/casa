import { Prisma, NotificationPriority, NotificationType } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateNotificationDTO,
  type NotificationQueryDTO,
  type NotificationListResponse,
  type ScanAlertsResult,
} from '#types/notification.types.js';

export const listNotifications = async (
  query: NotificationQueryDTO
): Promise<NotificationListResponse> => {
  const { userId, isRead, type, priority, limit = 20, offset = 0 } = query;

  const where: Prisma.NotificationWhereInput = {};

  if (userId) {
    where.OR = [{ userId }, { userId: null }];
  }

  if (typeof isRead === 'boolean') {
    where.isRead = isRead;
  }

  if (type) {
    where.type = type;
  }

  if (priority) {
    where.priority = priority;
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
        isRead: false,
      },
    }),
  ]);

  return {
    items: items as any,
    unreadCount,
    total,
  };
};

export const markAsRead = async (id: string, userId?: string) => {
  const where: Prisma.NotificationWhereUniqueInput = { id };

  const existing = await prisma.notification.findUnique({
    where,
  });

  if (!existing) {
    throw new Error('Notificación no encontrada');
  }

  return prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

export const markAllAsRead = async (userId?: string) => {
  const where: Prisma.NotificationWhereInput = {
    isRead: false,
    ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
  };

  const result = await prisma.notification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
};

export const deleteNotification = async (id: string) => {
  return prisma.notification.delete({
    where: { id },
  });
};

export const clearReadNotifications = async (userId?: string) => {
  const where: Prisma.NotificationWhereInput = {
    isRead: true,
    ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
  };

  const result = await prisma.notification.deleteMany({
    where,
  });

  return { deletedCount: result.count };
};

export const createNotification = async (dto: CreateNotificationDTO) => {
  return prisma.notification.create({
    data: {
      userId: dto.userId || null,
      type: dto.type,
      priority: dto.priority || NotificationPriority.MEDIUM,
      title: dto.title,
      message: dto.message,
      link: dto.link || null,
      metadata: (dto.metadata as any) || undefined,
    },
  });
};

/**
 * Motor de escaneo automático de alertas del ERP:
 * 1. Suscripciones próximas a vencer o vencidas (con WhatsApp link)
 * 2. Cuentas Streaming con fecha de corte de proveedor próxima
 * 3. Productos con stock bajo o agotado
 * 4. Ventas a crédito o pagos pendientes atrasados
 *
 * Utiliza idempotencia en 24h para no generar notificaciones duplicadas no leídas.
 */
export const scanAndGenerateAlerts = async (): Promise<ScanAlertsResult> => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Obtener alertas no leídas recientes para idempotencia
  const recentAlerts = await prisma.notification.findMany({
    where: {
      isRead: false,
      createdAt: { gte: oneDayAgo },
    },
    select: {
      type: true,
      metadata: true,
    },
  });

  const hasRecentAlert = (type: NotificationType, referenceKey: string, referenceId: string) => {
    return recentAlerts.some((a) => {
      if (a.type !== type) return false;
      const meta = a.metadata as Record<string, any> | null;
      return meta && meta[referenceKey] === referenceId;
    });
  };

  const alertsToCreate: CreateNotificationDTO[] = [];
  const details = {
    expiringSubscriptions: 0,
    upcomingCutoffs: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    overduePayments: 0,
  };

  // -------------------------------------------------------------
  // 1. Escaneo de Suscripciones Clientes Streaming
  // -------------------------------------------------------------
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expirationDate: { lte: threeDaysFromNow },
    },
    include: {
      customer: true,
      service: true,
      streamingProfile: true,
    },
  });

  for (const sub of subscriptions) {
    if (hasRecentAlert(NotificationType.STREAMING_EXPIRATION, 'subscriptionId', sub.id)) {
      continue;
    }

    const expTime = new Date(sub.expirationDate).getTime();
    const diffHours = Math.round((expTime - now.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.ceil((expTime - now.getTime()) / (1000 * 60 * 60 * 24));

    const isExpired = expTime < now.getTime();
    const priority = isExpired
      ? NotificationPriority.CRITICAL
      : diffDays <= 1
      ? NotificationPriority.HIGH
      : NotificationPriority.MEDIUM;

    const customerName = `${sub.customer.name} ${sub.customer.lastName || ''}`.trim();
    const serviceName = sub.service.name;
    const profileName = sub.streamingProfile?.profileName
      ? `(Pantalla: ${sub.streamingProfile.profileName})`
      : '';

    const formattedDate = new Date(sub.expirationDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const title = isExpired
      ? `Suscripción vencida: ${customerName}`
      : `Vencimiento próximo (${diffDays <= 0 ? 'Hoy' : diffDays + 'd'}): ${customerName}`;

    const message = isExpired
      ? `La suscripción de ${serviceName} ${profileName} venció el ${formattedDate}. Requiere renovación o suspensión.`
      : `La suscripción de ${serviceName} ${profileName} vence el ${formattedDate}.`;

    // WhatsApp Direct Link
    let whatsappUrl: string | null = null;
    if (sub.customer.phone) {
      const cleanPhone = sub.customer.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 7) {
        const text = isExpired
          ? `Hola ${customerName}, le saludamos de CASA ERP. Su suscripción a ${serviceName} ${profileName} venció el ${formattedDate}. ¿Desea realizar la renovación de su servicio?`
          : `Hola ${customerName}, le saludamos de CASA ERP. Le recordamos que su suscripción a ${serviceName} ${profileName} vence el próximo ${formattedDate}. Quedamos atentos para su oportuna renovación.`;
        whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      }
    }

    alertsToCreate.push({
      type: NotificationType.STREAMING_EXPIRATION,
      priority,
      title,
      message,
      link: '/subscriptions',
      metadata: {
        subscriptionId: sub.id,
        customerId: sub.customerId,
        customerName,
        customerPhone: sub.customer.phone,
        serviceName,
        expirationDate: sub.expirationDate,
        whatsappUrl,
      },
    });

    details.expiringSubscriptions++;
  }

  // -------------------------------------------------------------
  // 2. Escaneo de Fechas de Corte Cuentas Proveedor Streaming
  // -------------------------------------------------------------
  const streamingAccounts = await prisma.streamingAccount.findMany({
    where: {
      status: { in: ['AVAILABLE', 'FULL'] },
      supplierCutoffDate: { lte: threeDaysFromNow },
    },
    include: {
      service: true,
      supplier: true,
    },
  });

  for (const acc of streamingAccounts) {
    if (hasRecentAlert(NotificationType.STREAMING_CUTOFF, 'streamingAccountId', acc.id)) {
      continue;
    }

    const cutoffTime = new Date(acc.supplierCutoffDate).getTime();
    const isOverdue = cutoffTime < now.getTime();
    const formattedDate = new Date(acc.supplierCutoffDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const supplierName = acc.supplier?.tradeName || acc.supplier?.legalName || 'Proveedor';

    alertsToCreate.push({
      type: NotificationType.STREAMING_CUTOFF,
      priority: isOverdue ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      title: isOverdue
        ? `Corte de Cuenta Proveedor Vencido: ${acc.service.name}`
        : `Corte de Cuenta Próximo: ${acc.service.name}`,
      message: `Cuenta ${acc.accessEmail} (${acc.service.name}) con ${supplierName} tiene corte el ${formattedDate}.`,
      link: '/streaming',
      metadata: {
        streamingAccountId: acc.id,
        serviceName: acc.service.name,
        accessEmail: acc.accessEmail,
        supplierCutoffDate: acc.supplierCutoffDate,
      },
    });

    details.upcomingCutoffs++;
  }

  // -------------------------------------------------------------
  // 3. Escaneo de Stock Bajo o Agotado
  // -------------------------------------------------------------
  const physicalProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      inventories: true,
    },
  });

  for (const prod of physicalProducts) {
    const totalStock = prod.inventories.reduce((acc, inv) => {
      const avail = Number(inv.currentQuantity) - Number(inv.reservedQuantity);
      return acc + (avail > 0 ? avail : 0);
    }, 0);

    const minAlert = Number(prod.minStockAlert);

    if (totalStock === 0) {
      if (!hasRecentAlert(NotificationType.STOCK_OUT, 'productId', prod.id)) {
        alertsToCreate.push({
          type: NotificationType.STOCK_OUT,
          priority: NotificationPriority.CRITICAL,
          title: `Stock Agotado: ${prod.name}`,
          message: `El producto ${prod.name} (SKU: ${prod.sku}) no cuenta con existencias disponibles en almacén.`,
          link: '/inventory',
          metadata: {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            currentStock: 0,
            minStockAlert: minAlert,
          },
        });
        details.outOfStockProducts++;
      }
    } else if (minAlert > 0 && totalStock <= minAlert) {
      if (!hasRecentAlert(NotificationType.STOCK_LOW, 'productId', prod.id)) {
        alertsToCreate.push({
          type: NotificationType.STOCK_LOW,
          priority: NotificationPriority.MEDIUM,
          title: `Stock Bajo: ${prod.name}`,
          message: `El producto ${prod.name} (SKU: ${prod.sku}) tiene ${totalStock} unidad(es) (mínimo configurado: ${minAlert}).`,
          link: '/inventory',
          metadata: {
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            currentStock: totalStock,
            minStockAlert: minAlert,
          },
        });
        details.lowStockProducts++;
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Escaneo de Ventas con Pago Pendiente
  // -------------------------------------------------------------
  const pendingSales = await prisma.sale.findMany({
    where: {
      status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] },
      soldAt: { lte: oneDayAgo },
    },
    include: {
      customer: true,
      currency: true,
    },
    take: 20,
  });

  for (const sale of pendingSales) {
    if (hasRecentAlert(NotificationType.PAYMENT_OVERDUE, 'saleId', sale.id)) {
      continue;
    }

    const pendingBalance = Number(sale.total) - Number(sale.totalCollected);
    if (pendingBalance <= 0) continue;

    const customerName = sale.customer
      ? `${sale.customer.name} ${sale.customer.lastName || ''}`.trim()
      : 'Cliente Mostrador';

    alertsToCreate.push({
      type: NotificationType.PAYMENT_OVERDUE,
      priority: NotificationPriority.HIGH,
      title: `Cobranza Pendiente: Factura #${sale.documentNumber}`,
      message: `La venta #${sale.documentNumber} de ${customerName} tiene un saldo pendiente de ${pendingBalance.toFixed(2)} ${sale.currency.code}.`,
      link: '/sales',
      metadata: {
        saleId: sale.id,
        documentNumber: sale.documentNumber,
        customerName,
        customerPhone: sale.customer?.phone,
        pendingBalance,
        currencyCode: sale.currency.code,
      },
    });

    details.overduePayments++;
  }

  // Crear alertas en base de datos
  if (alertsToCreate.length > 0) {
    await prisma.notification.createMany({
      data: alertsToCreate.map((a) => ({
        userId: a.userId || null,
        type: a.type,
        priority: a.priority || NotificationPriority.MEDIUM,
        title: a.title,
        message: a.message,
        link: a.link || null,
        metadata: (a.metadata as any) || undefined,
      })),
    });
  }

  return {
    scanTimestamp: now,
    createdCount: alertsToCreate.length,
    details,
  };
};
