import { type Response, type NextFunction } from 'express';
import {
  signUpUser,
  signInUser,
  signOutUser,
  getSessionUser,
  changePassword as changePasswordService,
  updateProfile as updateProfileService,
  AuthError,
} from '#services/auth.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Función auxiliar para asignar cookies de sesión a la respuesta de Express.
 */
const setCookiesOnResponse = (res: Response, setCookieHeaders: string[]) => {
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    res.setHeader('Set-Cookie', setCookieHeaders);
  }
};

/**
 * Registro y creación de un nuevo usuario con campos extendidos.
 * POST /api/v1/auth/signup
 */
export const signUp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name, lastName, username, phone, roleName } =
      req.body;

    const result = await signUpUser(
      {
        email,
        password,
        name,
        lastName,
        username,
        phone,
        roleName,
      },
      req.headers
    );

    setCookiesOnResponse(res, result.setCookieHeaders);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Inicio de sesión de usuario (correo o nombre de usuario y contraseña).
 * POST /api/v1/auth/signin
 */
export const signIn = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, username, identifier, password } = req.body;

    const result = await signInUser(
      {
        email,
        username,
        identifier,
        password,
      },
      req.headers
    );

    setCookiesOnResponse(res, result.setCookieHeaders);

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Cierre de sesión y revocación del token o cookie.
 * POST /api/v1/auth/signout
 */
export const signOut = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await signOutUser(req.headers);

    setCookiesOnResponse(res, result.setCookieHeaders);

    res.status(200).json({
      success: true,
      message: 'Sesión finalizada exitosamente',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener la sesión activa actual (devuelve sesión y datos de usuario).
 * GET /api/v1/auth/session
 */
export const getSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionData = await getSessionUser(req.headers);

    if (!sessionData) {
      return res.status(200).json(null);
    }

    res.status(200).json(sessionData);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener el perfil completo del usuario autenticado con roles y permisos consolidados.
 * GET /api/v1/auth/me
 */
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
      session: req.session,
      roles: req.roles,
      permissions: req.permissions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambio de contraseña del usuario autenticado.
 * POST /api/v1/auth/change-password
 */
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword, revokeOtherSessions } = req.body;

    const result = await changePasswordService(
      {
        currentPassword,
        newPassword,
        revokeOtherSessions,
      },
      req.headers
    );

    setCookiesOnResponse(res, result.setCookieHeaders);

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar campos del perfil del usuario autenticado.
 * PATCH /api/v1/auth/profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { name, lastName, username, phone, image } = req.body;

    const updatedUser = await updateProfileService(req.user.id, {
      name,
      lastName,
      username,
      phone,
      image,
    });

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};