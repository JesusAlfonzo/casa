import { Router } from 'express';
import {
  getInventories,
  getInventoryById,
  adjustInventoryStock,
  transferInventoryStock,
  updateInventoryDetails,
  getInventoryMovements,
} from '#controllers/inventory.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

// Todas las operaciones sobre existencias y Kardex requieren usuario autenticado
router.get('/', requireAuth, getInventories);
router.get('/movements', requireAuth, getInventoryMovements);
router.get('/:id', requireAuth, getInventoryById);
router.post('/adjust', requireAuth, adjustInventoryStock);
router.post('/transfer', requireAuth, transferInventoryStock);
router.patch('/:id', requireAuth, updateInventoryDetails);

export default router;
