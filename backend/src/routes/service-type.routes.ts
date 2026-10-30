import { Router } from 'express';
import {
  createServiceType,
  getServiceTypes,
  getServiceTypeById,
  updateServiceType,
  toggleServiceTypeStatus,
  deleteServiceType,
} from '#controllers/service.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', requireAuth, getServiceTypes);
router.get('/:id', requireAuth, getServiceTypeById);
router.post('/', requireAuth, createServiceType);
router.put('/:id', requireAuth, updateServiceType);
router.patch('/:id', requireAuth, updateServiceType);
router.patch('/:id/status', requireAuth, toggleServiceTypeStatus);
router.delete('/:id', requireAuth, deleteServiceType);

export default router;
