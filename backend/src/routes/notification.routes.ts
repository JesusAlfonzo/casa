import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
  scanAlerts,
} from '#controllers/notification.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', requireAuth, getNotifications);
router.post('/scan', requireAuth, scanAlerts);
router.post('/mark-all-read', requireAuth, markAllNotificationsAsRead);
router.delete('/clear-read', requireAuth, clearReadNotifications);
router.patch('/:id/read', requireAuth, markNotificationAsRead);
router.delete('/:id', requireAuth, deleteNotification);

export default router;
