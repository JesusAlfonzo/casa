import { Router } from 'express';
import {
  getProfileById,
  updateStreamingProfile,
  toggleProfileOccupied,
} from '#controllers/streaming.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/:id', requireAuth, getProfileById);
router.put('/:id', requireAuth, updateStreamingProfile);
router.patch('/:id', requireAuth, updateStreamingProfile);
router.patch('/:id/toggle-occupied', requireAuth, toggleProfileOccupied);

export default router;
