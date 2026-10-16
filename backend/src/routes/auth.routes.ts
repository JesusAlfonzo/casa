import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import {
  signUp,
  signIn,
  signOut,
  getSession,
  getMe,
  changePassword,
  updateProfile,
} from '#controllers/auth.controller.js';
import { requireAuth } from '#middlewares/auth.middleware.js';
import { auth } from '#utils/auth.js';

const router: Router = Router();

// Rutas públicas de autenticación
router.post('/signup', signUp);
router.post('/signin', signIn);
router.get('/session', getSession);

// Rutas protegidas (requieren sesión activa)
router.post('/signout', requireAuth, signOut);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);
router.patch('/profile', requireAuth, updateProfile);

// Manejador nativo de Better Auth para rutas restantes (/api/auth/ok, etc.)
router.all('/*splat', toNodeHandler(auth));

export default router;