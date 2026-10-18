import { Router } from 'express';
import {
  createPaymentTransaction,
  getPaymentTransactions,
  getPaymentTransactionById,
  voidPaymentTransaction,
} from '#controllers/payment-transaction.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre transacciones de pago requieren usuario autenticado
router.get('/', requireAuth, getPaymentTransactions);
router.get('/:id', requireAuth, getPaymentTransactionById);
router.post('/', requireAuth, createPaymentTransaction);
router.post('/:id/void', requireAuth, voidPaymentTransaction);

export default router;
