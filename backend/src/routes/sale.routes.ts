import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleStats,
  getSaleById,
  addSalePayment,
  voidSale,
} from '#controllers/sale.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Métricas de ventas y facturación
router.get('/stats', requireAuth, getSaleStats);

// Operaciones generales de ventas
router.get('/', requireAuth, getSales);
router.get('/:id', requireAuth, getSaleById);
router.post('/', requireAuth, createSale);
router.post('/:id/payments', requireAuth, addSalePayment);
router.post('/:id/void', requireAuth, voidSale);

export default router;
