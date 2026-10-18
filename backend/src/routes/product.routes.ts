import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from '#controllers/product.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre productos requieren usuario autenticado
router.get('/', requireAuth, getProducts);
router.get('/:id', requireAuth, getProductById);
router.post('/', requireAuth, createProduct);
router.put('/:id', requireAuth, updateProduct);
router.patch('/:id', requireAuth, updateProduct);
router.patch('/:id/status', requireAuth, toggleProductStatus);
router.delete('/:id', requireAuth, deleteProduct);

export default router;
