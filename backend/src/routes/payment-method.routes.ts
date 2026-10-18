import { Router } from 'express';
import {
  createPaymentMethod,
  getPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  togglePaymentMethodStatus,
  deletePaymentMethod,
} from '#controllers/payment-method.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre métodos de pago requieren usuario autenticado
router.get('/', requireAuth, getPaymentMethods);
router.get('/:id', requireAuth, getPaymentMethodById);
router.post('/', requireAuth, createPaymentMethod);
router.put('/:id', requireAuth, updatePaymentMethod);
router.patch('/:id', requireAuth, updatePaymentMethod);
router.patch('/:id/status', requireAuth, togglePaymentMethodStatus);
router.delete('/:id', requireAuth, deletePaymentMethod);

export default router;
