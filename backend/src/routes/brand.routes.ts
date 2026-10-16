import { Router } from 'express';
import {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
} from '#controllers/brand.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre marcas requieren usuario autenticado
router.get('/', requireAuth, getBrands);
router.get('/:id', requireAuth, getBrandById);
router.post('/', requireAuth, createBrand);
router.put('/:id', requireAuth, updateBrand);
router.patch('/:id', requireAuth, updateBrand);
router.patch('/:id/status', requireAuth, toggleBrandStatus);
router.delete('/:id', requireAuth, deleteBrand);

export default router;
