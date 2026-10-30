import { Router } from 'express';
import {
  createStreamingAccount,
  getStreamingAccounts,
  getStreamingAccountStats,
  getStreamingAccountById,
  updateStreamingAccount,
  deleteStreamingAccount,
  getAccountProfiles,
} from '#controllers/streaming.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Estadísticas globales del parque de cuentas maestras
router.get('/stats', requireAuth, getStreamingAccountStats);

// Operaciones generales sobre cuentas de streaming
router.get('/', requireAuth, getStreamingAccounts);
router.get('/:id', requireAuth, getStreamingAccountById);
router.get('/:id/profiles', requireAuth, getAccountProfiles);
router.post('/', requireAuth, createStreamingAccount);
router.put('/:id', requireAuth, updateStreamingAccount);
router.patch('/:id', requireAuth, updateStreamingAccount);
router.delete('/:id', requireAuth, deleteStreamingAccount);

export default router;
