import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '#controllers/rbac.controller.js';
import { requireAuth, requireRoles } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Gestión de roles del sistema restringida a administradores
router.get('/', requireAuth, requireRoles('ADMIN'), getRoles);
router.get('/:id', requireAuth, requireRoles('ADMIN'), getRoleById);
router.post('/', requireAuth, requireRoles('ADMIN'), createRole);
router.put('/:id', requireAuth, requireRoles('ADMIN'), updateRole);
router.patch('/:id', requireAuth, requireRoles('ADMIN'), updateRole);
router.delete('/:id', requireAuth, requireRoles('ADMIN'), deleteRole);

export default router;
