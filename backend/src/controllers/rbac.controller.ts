import { type Response, type NextFunction } from 'express';
import {
  createUser as createUserService,
  getUsers as getUsersService,
  getUserById as getUserByIdService,
  toggleUserStatus as toggleUserStatusService,
  assignRolesToUser as assignRolesToUserService,
  setUserDirectPermissions as setUserDirectPermissionsService,
  getRoles as getRolesService,
  getRoleById as getRoleByIdService,
  createRole as createRoleService,
  updateRole as updateRoleService,
  deleteRole as deleteRoleService,
  getPermissions as getPermissionsService,
  getPermissionsGroupedByModule as getPermissionsGroupedByModuleService,
  RbacError,
} from '#services/rbac.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Registrar y crear un nuevo usuario desde el panel administrativo.
 * POST /api/users
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, lastName, email, username, phone, password, roleIds } =
      req.body;

    const user = await createUserService({
      name,
      lastName,
      email,
      username,
      phone,
      password,
      roleIds,
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: user,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar usuarios del sistema con filtros y paginación.
 * GET /api/users
 */
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      roleId,
      roleName,
      isActive,
      includeDeleted,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getUsersService({
      search: search as string,
      roleId: roleId as string,
      roleName: roleName as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      includeDeleted:
        includeDeleted !== undefined ? includeDeleted === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un usuario con sus roles y permisos.
 * GET /api/users/:id
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const user = await getUserByIdService(id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar estado activo / suspendido de un usuario.
 * PATCH /api/users/:id/status
 */
export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const updated = await toggleUserStatusService(id, req.user?.id);

    res.json({
      success: true,
      message: `Usuario ${updated.isActive ? 'activado' : 'suspendido'} exitosamente`,
      data: updated,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Asignar roles a un usuario.
 * POST /api/users/:id/roles
 */
export const assignUserRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { roleIds } = req.body;

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({
        error: 'El campo roleIds debe ser un arreglo de identificadores',
      });
    }

    const updated = await assignRolesToUserService(id, roleIds);

    res.json({
      success: true,
      message: 'Roles de usuario actualizados exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Configurar permisos directos (excepciones) a un usuario.
 * POST /api/users/:id/permissions
 */
export const setUserPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res
        .status(400)
        .json({ error: 'El campo permissions debe ser un arreglo' });
    }

    const updated = await setUserDirectPermissionsService(id, permissions);

    res.json({
      success: true,
      message: 'Permisos directos del usuario configurados exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// ============================================================================
// ROLE MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Listar roles del sistema.
 * GET /api/roles
 */
export const getRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive } = req.query;

    const roles = await getRolesService({
      search: search as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un rol por ID.
 * GET /api/roles/:id
 */
export const getRoleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const role = await getRoleByIdService(id);

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Crear un nuevo rol.
 * POST /api/roles
 */
export const createRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, permissionIds, isActive } = req.body;

    const role = await createRoleService({
      name,
      description,
      permissionIds,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: role,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar datos y permisos de un rol.
 * PUT/PATCH /api/roles/:id
 */
export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, description, permissionIds, isActive } = req.body;

    const role = await updateRoleService(id, {
      name,
      description,
      permissionIds,
      isActive,
    });

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: role,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un rol.
 * DELETE /api/roles/:id
 */
export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteRoleService(id);

    res.json({
      success: true,
      message: 'Rol eliminado exitosamente',
      data: deleted,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// ============================================================================
// PERMISSION CATALOG CONTROLLERS
// ============================================================================

/**
 * Listar permisos del sistema.
 * GET /api/permissions
 */
export const getPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { module, search } = req.query;

    const permissions = await getPermissionsService({
      module: module as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener permisos agrupados por módulo.
 * GET /api/permissions/by-module
 */
export const getPermissionsByModule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const groups = await getPermissionsGroupedByModuleService();

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
