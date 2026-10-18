import { Router } from 'express';
import {
  createExchangeRate,
  getExchangeRates,
  getCurrentRate,
  getExchangeRateById,
  updateExchangeRate,
  deleteExchangeRate,
} from '#controllers/exchange-rate.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre tasas de cambio requieren usuario autenticado
router.get('/', requireAuth, getExchangeRates);
router.get('/current', requireAuth, getCurrentRate);
router.get('/:id', requireAuth, getExchangeRateById);
router.post('/', requireAuth, createExchangeRate);
router.put('/:id', requireAuth, updateExchangeRate);
router.patch('/:id', requireAuth, updateExchangeRate);
router.delete('/:id', requireAuth, deleteExchangeRate);

export default router;
