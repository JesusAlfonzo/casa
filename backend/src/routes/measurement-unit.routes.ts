import { Router } from 'express';
import {
  createMeasurementUnit,
  getMeasurementUnits,
  getMeasurementUnitById,
  updateMeasurementUnit,
  deleteMeasurementUnit,
  toggleMeasurementUnitStatus,
} from '#controllers/measurement-unit.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre unidades de medida requieren usuario autenticado
router.get('/', requireAuth, getMeasurementUnits);
router.get('/:id', requireAuth, getMeasurementUnitById);
router.post('/', requireAuth, createMeasurementUnit);
router.put('/:id', requireAuth, updateMeasurementUnit);
router.patch('/:id', requireAuth, updateMeasurementUnit);
router.patch('/:id/status', requireAuth, toggleMeasurementUnitStatus);
router.delete('/:id', requireAuth, deleteMeasurementUnit);

export default router;
