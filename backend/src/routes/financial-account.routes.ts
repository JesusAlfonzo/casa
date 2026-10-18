import { Router } from 'express';
import {
  createFinancialAccount,
  getFinancialAccounts,
  getFinancialAccountById,
  updateFinancialAccount,
  adjustFinancialAccountBalance,
  toggleFinancialAccountStatus,
  deleteFinancialAccount,
} from '#controllers/financial-account.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre cuentas financieras requieren usuario autenticado
router.get('/', requireAuth, getFinancialAccounts);
router.get('/:id', requireAuth, getFinancialAccountById);
router.post('/', requireAuth, createFinancialAccount);
router.post('/:id/adjust-balance', requireAuth, adjustFinancialAccountBalance);
router.put('/:id', requireAuth, updateFinancialAccount);
router.patch('/:id', requireAuth, updateFinancialAccount);
router.patch('/:id/status', requireAuth, toggleFinancialAccountStatus);
router.delete('/:id', requireAuth, deleteFinancialAccount);

export default router;
