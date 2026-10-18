import { Router } from 'express';
import {
  createCurrency,
  getCurrencies,
  getBaseCurrency,
  getCurrencyById,
  updateCurrency,
  setBaseCurrency,
  toggleCurrencyStatus,
  deleteCurrency,
} from '#controllers/currency.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre monedas requieren usuario autenticado
router.get('/', requireAuth, getCurrencies);
router.get('/base', requireAuth, getBaseCurrency);
router.get('/:id', requireAuth, getCurrencyById);
router.post('/', requireAuth, createCurrency);
router.put('/:id', requireAuth, updateCurrency);
router.patch('/:id', requireAuth, updateCurrency);
router.patch('/:id/base', requireAuth, setBaseCurrency);
router.patch('/:id/status', requireAuth, toggleCurrencyStatus);
router.delete('/:id', requireAuth, deleteCurrency);

export default router;
