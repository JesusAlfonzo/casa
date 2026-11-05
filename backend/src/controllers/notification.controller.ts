import { type Response, type NextFunction } from 'express';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification as deleteNotificationService,
  clearReadNotifications as clearReadNotificationsService,
  scanAndGenerateAlerts,
} from '#services/notification.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isRead, type, priority, limit, offset } = req.query;

    const result = await listNotifications({
      userId: req.user?.id,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type: type as any,
      priority: priority as any,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await markAsRead(id, req.user?.id);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await markAllAsRead(req.user?.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteNotificationService(id);

    res.json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    next(error);
  }
};

export const clearReadNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await clearReadNotificationsService(req.user?.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const scanAlerts = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await scanAndGenerateAlerts();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
