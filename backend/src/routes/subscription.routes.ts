import { Router } from 'express';
import {
  createSubscription,
  getSubscriptions,
  getSubscriptionStats,
  getSubscriptionById,
  renewSubscription,
  updateSubscription,
  deleteSubscription,
} from '#controllers/subscription.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Métricas clave y MRR
router.get('/stats', requireAuth, getSubscriptionStats);

// Operaciones generales sobre suscripciones
router.get('/', requireAuth, getSubscriptions);
router.get('/:id', requireAuth, getSubscriptionById);
router.post('/', requireAuth, createSubscription);
router.post('/:id/renew', requireAuth, renewSubscription);
router.put('/:id', requireAuth, updateSubscription);
router.patch('/:id', requireAuth, updateSubscription);
router.delete('/:id', requireAuth, deleteSubscription);

export default router;
