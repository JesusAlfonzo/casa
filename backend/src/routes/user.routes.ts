import { Router } from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  toggleUserStatus,
  assignUserRoles,
  setUserPermissions,
} from '#controllers/rbac.controller.js';
import { requireAuth, requireRoles } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Gestión de usuarios restringida a administradores
router.get('/', requireAuth, requireRoles('ADMIN'), getUsers);
router.post('/', requireAuth, requireRoles('ADMIN'), createUser);
router.get('/:id', requireAuth, requireRoles('ADMIN'), getUserById);
router.patch(
  '/:id/status',
  requireAuth,
  requireRoles('ADMIN'),
  toggleUserStatus
);
router.post('/:id/roles', requireAuth, requireRoles('ADMIN'), assignUserRoles);
router.post(
  '/:id/permissions',
  requireAuth,
  requireRoles('ADMIN'),
  setUserPermissions
);

export default router;
