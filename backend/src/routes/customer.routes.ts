import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  toggleCustomerStatus,
  deleteCustomer,
} from '#controllers/customer.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', requireAuth, getCustomers);
router.get('/:id', requireAuth, getCustomerById);
router.post('/', requireAuth, createCustomer);
router.put('/:id', requireAuth, updateCustomer);
router.patch('/:id', requireAuth, updateCustomer);
router.patch('/:id/status', requireAuth, toggleCustomerStatus);
router.delete('/:id', requireAuth, deleteCustomer);

export default router;
