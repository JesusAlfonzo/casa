import { Router } from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getCashflowReport,
  getSubscriptionsReport,
} from '#controllers/report.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/sales', requireAuth, getSalesReport);
router.get('/inventory', requireAuth, getInventoryReport);
router.get('/cashflow', requireAuth, getCashflowReport);
router.get('/subscriptions', requireAuth, getSubscriptionsReport);

export default router;
