import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from '#controllers/category.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre categorías requieren usuario autenticado
router.get('/', requireAuth, getCategories);
router.get('/tree', requireAuth, getCategoryTree);
router.get('/:id', requireAuth, getCategoryById);
router.post('/', requireAuth, createCategory);
router.put('/:id', requireAuth, updateCategory);
router.patch('/:id', requireAuth, updateCategory);
router.patch('/:id/status', requireAuth, toggleCategoryStatus);
router.delete('/:id', requireAuth, deleteCategory);

export default router;
