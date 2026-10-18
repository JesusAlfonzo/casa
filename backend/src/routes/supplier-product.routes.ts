import { Router } from 'express';
import {
  assignSupplierProduct,
  getSupplierProducts,
  getSupplierProductById,
  updateSupplierProduct,
  setPrimarySupplier,
  removeSupplierProduct,
} from '#controllers/supplier-product.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones requieren usuario autenticado
router.get('/', requireAuth, getSupplierProducts);
router.get('/:id', requireAuth, getSupplierProductById);
router.post('/', requireAuth, assignSupplierProduct);
router.put('/:id', requireAuth, updateSupplierProduct);
router.patch('/:id', requireAuth, updateSupplierProduct);
router.patch('/:id/primary', requireAuth, setPrimarySupplier);
router.delete('/:id', requireAuth, removeSupplierProduct);

export default router;
