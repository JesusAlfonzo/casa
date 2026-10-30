import { Router } from 'express';
import {
  getPermissions,
  getPermissionsByModule,
} from '#controllers/rbac.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Catálogo de permisos disponible para usuarios autenticados
router.get('/by-module', requireAuth, getPermissionsByModule);
router.get('/', requireAuth, getPermissions);

export default router;
