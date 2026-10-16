import { type Response, type NextFunction } from 'express';
import { getSessionUser } from '#services/auth.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Middleware para exigir que la solicitud provenga de un usuario autenticado y activo.
 * Admite autenticación tanto por Cookies de sesión como por cabecera Bearer Token.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionData = await getSessionUser(req.headers);

    if (!sessionData) {
      return res.status(401).json({
        error: 'No autorizado. Debe iniciar sesión para acceder a este recurso.',
      });
    }

    if (!sessionData.user.isActive) {
      return res.status(403).json({
        error: 'Acceso denegado. La cuenta de usuario se encuentra desactivada.',
      });
    }

    req.session = sessionData.session;
    req.user = sessionData.user;
    req.roles = sessionData.user.roles;
    req.permissions = sessionData.user.permissions;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'No autorizado. Error al validar la sesión.',
    });
  }
};

/**
 * Middleware para verificar si el usuario autenticado tiene al menos uno de los roles requeridos.
 * Ejemplo de uso: router.get('/admin-only', requireAuth, requireRoles('ADMIN'), handler);
 */
export const requireRoles = (...allowedRoles: string[]) => {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.roles) {
      return res.status(401).json({
        error: 'No autorizado. Se requiere iniciar sesión.',
      });
    }

    const hasRole = req.roles.some((role) =>
      normalizedAllowed.includes(role.toUpperCase())
    );

    if (!hasRole) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware para verificar si el usuario autenticado tiene los permisos requeridos.
 * Ejemplo de uso: router.post('/products', requireAuth, requirePermissions('products.create'), handler);
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.permissions) {
      return res.status(401).json({
        error: 'No autorizado. Se requiere iniciar sesión.',
      });
    }

    const hasAll = requiredPermissions.every((perm) =>
      req.permissions?.includes(perm)
    );

    if (!hasAll) {
      return res.status(403).json({
        error: `Acceso denegado. Se requieren los siguientes permisos: ${requiredPermissions.join(', ')}`,
      });
    }

    next();
  };
};