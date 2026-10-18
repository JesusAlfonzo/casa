import { Router } from 'express';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  receivePurchaseItems,
  updatePurchase,
  cancelPurchase,
} from '#controllers/purchase.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre compras requieren usuario autenticado
router.get('/', requireAuth, getPurchases);
router.get('/:id', requireAuth, getPurchaseById);
router.post('/', requireAuth, createPurchase);
router.post('/:id/receive', requireAuth, receivePurchaseItems);
router.post('/:id/cancel', requireAuth, cancelPurchase);
router.patch('/:id', requireAuth, updatePurchase);

export default router;
