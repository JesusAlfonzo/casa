import { type Response, type NextFunction } from 'express';
import {
  createSubscription as createSubscriptionService,
  getSubscriptions as getSubscriptionsService,
  getSubscriptionById as getSubscriptionByIdService,
  renewSubscription as renewSubscriptionService,
  updateSubscription as updateSubscriptionService,
  deleteSubscription as deleteSubscriptionService,
  getSubscriptionStats as getSubscriptionStatsService,
  SubscriptionError,
} from '#services/subscription.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva suscripción de cliente.
 * POST /api/subscriptions
 */
export const createSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      code,
      customerId,
      serviceId,
      streamingAccountId,
      streamingProfileId,
      agreedPrice,
      startDate,
      expirationDate,
      durationDays,
      autoRenew,
      status,
      notes,
    } = req.body;

    const subscription = await createSubscriptionService({
      code,
      customerId,
      serviceId,
      streamingAccountId,
      streamingProfileId,
      agreedPrice,
      startDate,
      expirationDate,
      durationDays,
      autoRenew,
      status,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Suscripción registrada exitosamente',
      data: subscription,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar suscripciones con filtros avanzados y paginación.
 * GET /api/subscriptions
 */
export const getSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      customerId,
      serviceId,
      streamingAccountId,
      streamingProfileId,
      status,
      expiringBefore,
      expiringWithinDays,
      autoRenew,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getSubscriptionsService({
      search: search as string,
      customerId: customerId as string,
      serviceId: serviceId as string,
      streamingAccountId: streamingAccountId as string,
      streamingProfileId: streamingProfileId as string,
      status: status as any,
      expiringBefore: expiringBefore as string,
      expiringWithinDays:
        expiringWithinDays !== undefined
          ? Number(expiringWithinDays)
          : undefined,
      autoRenew: autoRenew !== undefined ? autoRenew === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener estadísticas globales y MRR de suscripciones.
 * GET /api/subscriptions/stats
 */
export const getSubscriptionStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getSubscriptionStatsService();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una suscripción por ID.
 * GET /api/subscriptions/:id
 */
export const getSubscriptionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const subscription = await getSubscriptionByIdService(id);

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Renovar una suscripción extendiendo su fecha de corte.
 * POST /api/subscriptions/:id/renew
 */
export const renewSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { days, newExpirationDate, agreedPrice, notes } = req.body;

    const subscription = await renewSubscriptionService(id, {
      days,
      newExpirationDate,
      agreedPrice,
      notes,
    });

    res.json({
      success: true,
      message: 'Suscripción renovada exitosamente',
      data: subscription,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una suscripción.
 * PUT/PATCH /api/subscriptions/:id
 */
export const updateSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      customerId,
      serviceId,
      streamingAccountId,
      streamingProfileId,
      agreedPrice,
      startDate,
      expirationDate,
      autoRenew,
      status,
      notes,
    } = req.body;

    const subscription = await updateSubscriptionService(id, {
      customerId,
      serviceId,
      streamingAccountId,
      streamingProfileId,
      agreedPrice,
      startDate,
      expirationDate,
      autoRenew,
      status,
      notes,
    });

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente',
      data: subscription,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una suscripción si no tiene ventas asociadas.
 * DELETE /api/subscriptions/:id
 */
export const deleteSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteSubscriptionService(id);

    res.json({
      success: true,
      message: 'Suscripción eliminada exitosamente y recursos liberados',
      data: deleted,
    });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
