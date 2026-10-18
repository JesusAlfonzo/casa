import { Router } from 'express';
import {
  createLocation,
  getLocations,
  getLocationTree,
  getLocationById,
  updateLocation,
  deleteLocation,
  toggleLocationStatus,
} from '#controllers/location.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre ubicaciones requieren usuario autenticado
router.get('/', requireAuth, getLocations);
router.get('/tree', requireAuth, getLocationTree);
router.get('/:id', requireAuth, getLocationById);
router.post('/', requireAuth, createLocation);
router.put('/:id', requireAuth, updateLocation);
router.patch('/:id', requireAuth, updateLocation);
router.patch('/:id/status', requireAuth, toggleLocationStatus);
router.delete('/:id', requireAuth, deleteLocation);

export default router;
