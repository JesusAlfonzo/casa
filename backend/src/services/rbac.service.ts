import { Prisma, type Role, type Permission } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import { auth } from '#utils/auth.js';
import {
  type CreateUserDTO,
  type UserQueryDTO,
  type PaginatedUsersResult,
  type UserSummaryItem,
  type CreateRoleDTO,
  type UpdateRoleDTO,
  type RoleQueryDTO,
  type RoleWithDetails,
  type PermissionQueryDTO,
  type ModulePermissionsGroup,
  type UserDirectPermissionItemDTO,
} from '#types/rbac.types.js';

export class RbacError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'RbacError';
    this.statusCode = statusCode;
  }
}

// ============================================================================
// USER MANAGEMENT SERVICES
// ============================================================================

/**
 * Listar usuarios del sistema con filtros de rol, estado y búsqueda.
 */
export const getUsers = async (
  query: UserQueryDTO
): Promise<PaginatedUsersResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (!query.includeDeleted) {
    where.deletedAt = null;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.isActive !== undefined) {
    where.isActive =
      typeof query.isActive === 'string'
        ? query.isActive === 'true'
        : Boolean(query.isActive);
  }

  if (query.roleId) {
    where.roles = { some: { roleId: query.roleId } };
  } else if (query.roleName) {
    where.roles = {
      some: { role: { name: { equals: query.roleName, mode: 'insensitive' } } },
    };
  }

  const validSortFields: Array<'name' | 'email' | 'createdAt' | 'lastLoginAt'> =
    ['name', 'email', 'createdAt', 'lastLoginAt'];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'createdAt';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [rawUsers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        username: true,
        phone: true,
        image: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            directPermissions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items: UserSummaryItem[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    lastName: u.lastName,
    email: u.email,
    username: u.username,
    phone: u.phone,
    image: u.image,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    roles: u.roles.map((r) => r.role),
    directPermissionsCount: u._count.directPermissions,
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Registrar y crear un nuevo usuario desde el panel de administración con roles opcionales.
 */
export const createUser = async (dto: CreateUserDTO) => {
  const name = dto.name?.trim();
  const lastName = dto.lastName?.trim() || null;
  const email = dto.email?.trim().toLowerCase();
  const username = dto.username?.trim().toLowerCase() || null;
  const phone = dto.phone?.trim() || null;
  const password = dto.password;

  if (!name) {
    throw new RbacError('El nombre es obligatorio', 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RbacError('El formato del correo electrónico no es válido', 400);
  }

  if (!password || password.length < 8) {
    throw new RbacError('La contraseña debe tener al menos 8 caracteres', 400);
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new RbacError('El correo electrónico ya se encuentra registrado', 409);
  }

  if (username) {
    if (username.length < 3) {
      throw new RbacError('El nombre de usuario debe tener al menos 3 caracteres', 400);
    }
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new RbacError('El nombre de usuario ya está en uso', 409);
    }
  }

  if (dto.roleIds && dto.roleIds.length > 0) {
    const rolesCount = await prisma.role.count({
      where: { id: { in: dto.roleIds }, isActive: true },
    });
    if (rolesCount !== dto.roleIds.length) {
      throw new RbacError('Uno o más de los roles especificados no existen o están inactivos', 400);
    }
  }

  const response = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      lastName: lastName ?? undefined,
      username: username ?? undefined,
      phone: phone ?? undefined,
    },
    asResponse: true,
  });

  if (!response.ok) {
    const errorBody: any = await response.json().catch(() => ({}));
    throw new RbacError(errorBody.message || 'Error al crear el usuario', response.status || 400);
  }

  const data: any = await response.json();
  const newUserId = data.user?.id;

  if (dto.roleIds && dto.roleIds.length > 0 && newUserId) {
    await prisma.userRole.createMany({
      data: dto.roleIds.map((roleId) => ({
        userId: newUserId,
        roleId,
      })),
      skipDuplicates: true,
    });
  }

  return getUserById(newUserId);
};

/**
 * Obtener detalle completo de un usuario, sus roles y permisos asignados.
 */
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      emailVerified: true,
      username: true,
      phone: true,
      image: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      roles: {
        select: {
          assignedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              isSystem: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      module: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      directPermissions: {
        select: {
          isGranted: true,
          assignedAt: true,
          permission: {
            select: {
              id: true,
              code: true,
              name: true,
              module: true,
              description: true,
            },
          },
        },
      },
      _count: {
        select: {
          sales: true,
          purchases: true,
          paymentTransactions: true,
          inventoryMovements: true,
        },
      },
    },
  });

  if (!user) {
    throw new RbacError('El usuario especificado no existe', 404);
  }

  return user;
};

/**
 * Alternar estado activo / suspendido de un usuario.
 */
export const toggleUserStatus = async (id: string, currentUserId?: string) => {
  if (id === currentUserId) {
    throw new RbacError(
      'No puede suspender o desactivar su propia cuenta de usuario',
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw new RbacError('El usuario no existe', 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updated;
};

/**
 * Asignar roles a un usuario.
 */
export const assignRolesToUser = async (userId: string, roleIds: string[]) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new RbacError('El usuario especificado no existe', 404);
  }

  // Validar existencia de los roles
  if (roleIds.length > 0) {
    const rolesCount = await prisma.role.count({
      where: { id: { in: roleIds }, isActive: true },
    });

    if (rolesCount !== roleIds.length) {
      throw new RbacError(
        'Uno o más de los roles especificados no existen o están inactivos',
        400
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    // Eliminar asignaciones anteriores
    await tx.userRole.deleteMany({
      where: { userId },
    });

    // Crear nuevas asignaciones
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });
  });
};

/**
 * Configurar permisos directos (excepciones de concesión o revocación) a un usuario.
 */
export const setUserDirectPermissions = async (
  userId: string,
  permissions: UserDirectPermissionItemDTO[]
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new RbacError('El usuario especificado no existe', 404);
  }

  if (permissions.length > 0) {
    const permIds = permissions.map((p) => p.permissionId);
    const validCount = await prisma.permission.count({
      where: { id: { in: permIds } },
    });

    if (validCount !== permIds.length) {
      throw new RbacError(
        'Uno o más de los permisos especificados no existen',
        400
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({
      where: { userId },
    });

    if (permissions.length > 0) {
      await tx.userPermission.createMany({
        data: permissions.map((p) => ({
          userId,
          permissionId: p.permissionId,
          isGranted: p.isGranted ?? true,
        })),
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        directPermissions: {
          select: {
            isGranted: true,
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
              },
            },
          },
        },
      },
    });
  });
};

// ============================================================================
// ROLE MANAGEMENT SERVICES
// ============================================================================

/**
 * Listar roles del sistema.
 */
export const getRoles = async (
  query: RoleQueryDTO
): Promise<RoleWithDetails[]> => {
  const where: Prisma.RoleWhereInput = {};

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (query.isActive !== undefined) {
    where.isActive =
      typeof query.isActive === 'string'
        ? query.isActive === 'true'
        : Boolean(query.isActive);
  }

  const roles = await prisma.role.findMany({
    where,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
    },
  });

  return roles as RoleWithDetails[];
};

/**
 * Obtener detalle de un rol por ID con sus permisos asignados.
 */
export const getRoleById = async (id: string): Promise<RoleWithDetails> => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          users: true,
          permissions: true,
        },
      },
    },
  });

  if (!role) {
    throw new RbacError('El rol especificado no existe', 404);
  }

  return role as RoleWithDetails;
};

/**
 * Crear un nuevo rol con permisos asociados opcionales.
 */
export const createRole = async (
  dto: CreateRoleDTO
): Promise<RoleWithDetails> => {
  const name = dto.name?.trim().toUpperCase();
  if (!name) {
    throw new RbacError('El nombre del rol es obligatorio', 400);
  }

  const existing = await prisma.role.findUnique({
    where: { name },
  });
  if (existing) {
    throw new RbacError(`Ya existe un rol con el nombre "${name}"`, 409);
  }

  if (dto.permissionIds && dto.permissionIds.length > 0) {
    const validPermCount = await prisma.permission.count({
      where: { id: { in: dto.permissionIds } },
    });
    if (validPermCount !== dto.permissionIds.length) {
      throw new RbacError(
        'Uno o varios de los permisos asignados no existen',
        400
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        isSystem: false,
        isActive: dto.isActive ?? true,
        permissions:
          dto.permissionIds && dto.permissionIds.length > 0
            ? {
                create: dto.permissionIds.map((permissionId) => ({
                  permissionId,
                })),
              }
            : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    return role as RoleWithDetails;
  });
};

/**
 * Actualizar datos y permisos de un rol.
 */
export const updateRole = async (
  id: string,
  dto: UpdateRoleDTO
): Promise<RoleWithDetails> => {
  const role = await prisma.role.findUnique({
    where: { id },
  });

  if (!role) {
    throw new RbacError('El rol no existe', 404);
  }

  if (dto.name !== undefined) {
    const name = dto.name.trim().toUpperCase();
    if (!name) {
      throw new RbacError('El nombre del rol no puede estar vacío', 400);
    }
    if (role.isSystem && name !== role.name) {
      throw new RbacError(
        'No se puede renombrar un rol predeterminado del sistema',
        400
      );
    }
    if (name !== role.name) {
      const duplicate = await prisma.role.findUnique({
        where: { name },
      });
      if (duplicate) {
        throw new RbacError(`Ya existe otro rol con el nombre "${name}"`, 409);
      }
    }
  }

  return await prisma.$transaction(async (tx) => {
    const data: Prisma.RoleUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim().toUpperCase();
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      if (role.isSystem && !dto.isActive) {
        throw new RbacError(
          'No se puede desactivar un rol fundamental del sistema',
          400
        );
      }
      data.isActive = Boolean(dto.isActive);
    }

    // Sincronizar permisos si fueron enviados
    if (dto.permissionIds !== undefined) {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    const updated = await tx.role.update({
      where: { id },
      data,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    return updated as RoleWithDetails;
  });
};

/**
 * Eliminar un rol si no es del sistema y no posee usuarios asignados.
 */
export const deleteRole = async (id: string): Promise<Role> => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!role) {
    throw new RbacError('El rol especificado no existe', 404);
  }

  if (role.isSystem) {
    throw new RbacError(
      'No se pueden eliminar los roles predeterminados del sistema',
      400
    );
  }

  if (role._count.users > 0) {
    throw new RbacError(
      `No se puede eliminar el rol porque tiene ${role._count.users} usuario(s) asignado(s). Reasigne a los usuarios antes de eliminarlo.`,
      400
    );
  }

  return await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId: id },
    });

    return tx.role.delete({
      where: { id },
    });
  });
};

// ============================================================================
// PERMISSION CATALOG SERVICES
// ============================================================================

/**
 * Listar permisos con filtros por módulo y búsqueda.
 */
export const getPermissions = async (
  query: PermissionQueryDTO
): Promise<Permission[]> => {
  const where: Prisma.PermissionWhereInput = {};

  if (query.module?.trim()) {
    where.module = { equals: query.module.trim(), mode: 'insensitive' };
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { code: { contains: s, mode: 'insensitive' } },
      { name: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
    ];
  }

  return prisma.permission.findMany({
    where,
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });
};

/**
 * Obtener el catálogo de permisos agrupado por módulo para interfaces de configuración.
 */
export const getPermissionsGroupedByModule = async (): Promise<
  ModulePermissionsGroup[]
> => {
  const allPermissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });

  const moduleMap = new Map<string, Permission[]>();

  for (const perm of allPermissions) {
    const currentList = moduleMap.get(perm.module) || [];
    currentList.push(perm);
    moduleMap.set(perm.module, currentList);
  }

  const groups: ModulePermissionsGroup[] = [];
  for (const [module, permissions] of moduleMap.entries()) {
    groups.push({ module, permissions });
  }

  return groups;
};
