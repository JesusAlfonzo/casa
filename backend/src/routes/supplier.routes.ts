import { Router } from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
} from '#controllers/supplier.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre proveedores requieren usuario autenticado
router.get('/', requireAuth, getSuppliers);
router.get('/:id', requireAuth, getSupplierById);
router.post('/', requireAuth, createSupplier);
router.put('/:id', requireAuth, updateSupplier);
router.patch('/:id', requireAuth, updateSupplier);
router.patch('/:id/status', requireAuth, toggleSupplierStatus);
router.delete('/:id', requireAuth, deleteSupplier);

export default router;
