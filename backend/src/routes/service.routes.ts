import { Router } from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  toggleServiceStatus,
  deleteService,
} from '#controllers/service.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', requireAuth, getServices);
router.get('/:id', requireAuth, getServiceById);
router.post('/', requireAuth, createService);
router.put('/:id', requireAuth, updateService);
router.patch('/:id', requireAuth, updateService);
router.patch('/:id/status', requireAuth, toggleServiceStatus);
router.delete('/:id', requireAuth, deleteService);

export default router;
