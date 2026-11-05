import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  exportBackup,
} from '#controllers/setting.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones de configuración requieren autenticación
router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, updateSettings);
router.post('/', requireAuth, updateSettings);
router.get('/backup', requireAuth, exportBackup);

export default router;
