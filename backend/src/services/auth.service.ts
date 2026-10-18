import { fromNodeHeaders } from 'better-auth/node';
import { prisma } from '#config/prisma.js';
import { auth } from '#utils/auth.js';
import {
  type SignUpDTO,
  type SignInDTO,
  type ChangePasswordDTO,
  type UpdateProfileDTO,
  type AuthenticatedUser,
} from '#types/auth.types.js';

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Extrae las cabeceras Set-Cookie de un Response estándar de Fetch.
 */
export const extractSetCookies = (response: Response): string[] => {
  if (typeof (response.headers as any).getSetCookie === 'function') {
    return (response.headers as any).getSetCookie();
  }
  const cookie = response.headers.get('set-cookie');
  return cookie ? [cookie] : [];
};

/**
 * Consulta y consolida los datos del usuario con sus roles y permisos RBAC.
 */
export const getUserWithRolesAndPermissions = async (
  userId: string
): Promise<AuthenticatedUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      emailVerified: true,
      image: true,
      username: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      directPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user || user.deletedAt) {
    return null;
  }

  const roleNames = user.roles.map((r) => r.role.name);

  // Consolidar permisos de roles
  const permissionsSet = new Set<string>();
  for (const userRole of user.roles) {
    for (const rolePerm of userRole.role.permissions) {
      if (rolePerm.permission?.code) {
        permissionsSet.add(rolePerm.permission.code);
      }
    }
  }

  // Aplicar excepciones o permisos directos del usuario
  for (const directPerm of user.directPermissions) {
    if (directPerm.permission?.code) {
      if (directPerm.isGranted) {
        permissionsSet.add(directPerm.permission.code);
      } else {
        permissionsSet.delete(directPerm.permission.code);
      }
    }
  }

  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    username: user.username,
    phone: user.phone,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: roleNames,
    permissions: Array.from(permissionsSet),
  };
};

/**
 * Registro de un nuevo usuario con validaciones y campos adicionales.
 */
export const signUpUser = async (
  dto: SignUpDTO,
  rawHeaders: any
): Promise<{
  token?: string;
  user: AuthenticatedUser;
  setCookieHeaders: string[];
}> => {
  const email = dto.email?.trim().toLowerCase();
  const password = dto.password;
  const name = dto.name?.trim();
  const lastName = dto.lastName?.trim() || null;
  const username = dto.username?.trim().toLowerCase() || null;
  const phone = dto.phone?.trim() || null;

  if (!name) {
    throw new AuthError('El nombre es obligatorio', 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError('El formato del correo electrónico no es válido', 400);
  }

  if (!password || password.length < 8) {
    throw new AuthError('La contraseña debe tener al menos 8 caracteres', 400);
  }

  // Validar si el email ya existe en la base de datos
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new AuthError(
      'El correo electrónico ya se encuentra registrado',
      409
    );
  }

  // Validar si el username ya existe en la base de datos
  if (username) {
    if (username.length < 3) {
      throw new AuthError(
        'El nombre de usuario debe tener al menos 3 caracteres',
        400
      );
    }
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new AuthError('El nombre de usuario ya está en uso', 409);
    }
  }

  // Llamada a Better Auth
  const response = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      lastName: lastName ?? undefined,
      username: username ?? undefined,
      phone: phone ?? undefined,
    },
    headers: fromNodeHeaders(rawHeaders),
    asResponse: true,
  });

  if (!response.ok) {
    const errorBody: any = await response.json().catch(() => ({}));
    throw new AuthError(
      errorBody.message || 'Error al registrar el usuario',
      response.status || 400
    );
  }

  const data: any = await response.json();
  const setCookieHeaders = extractSetCookies(response);

  // Asignar rol inicial si fue provisto
  if (dto.roleName && data.user?.id) {
    const targetRole = await prisma.role.findUnique({
      where: { name: dto.roleName.toUpperCase() },
    });
    if (targetRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: data.user.id,
            roleId: targetRole.id,
          },
        },
        create: {
          userId: data.user.id,
          roleId: targetRole.id,
        },
        update: {},
      });
    }
  }

  const fullUser = await getUserWithRolesAndPermissions(data.user.id);
  if (!fullUser) {
    throw new AuthError('Error al recuperar los datos del usuario creado', 500);
  }

  return {
    token: data.token,
    user: fullUser,
    setCookieHeaders,
  };
};

/**
 * Autenticación de usuario por correo o nombre de usuario y contraseña.
 */
export const signInUser = async (
  dto: SignInDTO,
  rawHeaders: any
): Promise<{
  token?: string;
  user: AuthenticatedUser;
  setCookieHeaders: string[];
}> => {
  const identifier = (dto.identifier || dto.email || dto.username)?.trim();
  const password = dto.password;

  if (!identifier) {
    throw new AuthError('Debe ingresar su correo o nombre de usuario', 400);
  }

  if (!password) {
    throw new AuthError('Debe ingresar su contraseña', 400);
  }

  let emailToUse = identifier.toLowerCase();

  // Si el identificador no tiene formato de correo, buscar por nombre de usuario
  if (!emailToUse.includes('@')) {
    const userFoundByUsername = await prisma.user.findUnique({
      where: { username: emailToUse },
    });
    if (!userFoundByUsername) {
      throw new AuthError('Credenciales inválidas', 401);
    }
    emailToUse = userFoundByUsername.email.toLowerCase();
  }

  // Verificar estado del usuario antes de autenticar
  const userRecord = await prisma.user.findUnique({
    where: { email: emailToUse },
  });

  if (userRecord) {
    if (userRecord.deletedAt) {
      throw new AuthError('Esta cuenta ha sido eliminada', 403);
    }
    if (!userRecord.isActive) {
      throw new AuthError(
        'La cuenta se encuentra desactivada. Contacte al administrador.',
        403
      );
    }
  }

  // Llamada a Better Auth
  const response = await auth.api.signInEmail({
    body: {
      email: emailToUse,
      password,
    },
    headers: fromNodeHeaders(rawHeaders),
    asResponse: true,
  });

  if (!response.ok) {
    const errorBody: any = await response.json().catch(() => ({}));
    throw new AuthError(
      errorBody.message || 'Correo o contraseña incorrectos',
      401
    );
  }

  const data: any = await response.json();
  const setCookieHeaders = extractSetCookies(response);

  // Actualizar marca de tiempo de último inicio de sesión
  if (data.user?.id) {
    await prisma.user.update({
      where: { id: data.user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const fullUser = await getUserWithRolesAndPermissions(data.user.id);
  if (!fullUser) {
    throw new AuthError('Error al recuperar información del usuario', 500);
  }

  return {
    token: data.token,
    user: fullUser,
    setCookieHeaders,
  };
};

/**
 * Cierre de sesión e invalidación de token/cookie.
 */
export const signOutUser = async (
  rawHeaders: any
): Promise<{ setCookieHeaders: string[] }> => {
  const response = await auth.api.signOut({
    headers: fromNodeHeaders(rawHeaders),
    asResponse: true,
  });

  const setCookieHeaders = extractSetCookies(response);
  return { setCookieHeaders };
};

/**
 * Obtener la sesión activa y el usuario autenticado.
 */
export const getSessionUser = async (
  rawHeaders: any
): Promise<{
  session: any;
  user: AuthenticatedUser;
} | null> => {
  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(rawHeaders),
  });

  if (!sessionData?.user) {
    return null;
  }

  const fullUser = await getUserWithRolesAndPermissions(sessionData.user.id);
  if (!fullUser || !fullUser.isActive) {
    return null;
  }

  return {
    session: sessionData.session,
    user: fullUser,
  };
};

/**
 * Cambio de contraseña para el usuario autenticado.
 */
export const changePassword = async (
  dto: ChangePasswordDTO,
  rawHeaders: any
): Promise<{ setCookieHeaders: string[] }> => {
  if (!dto.currentPassword || !dto.newPassword) {
    throw new AuthError(
      'Debe proporcionar la contraseña actual y la nueva contraseña',
      400
    );
  }

  if (dto.newPassword.length < 8) {
    throw new AuthError(
      'La nueva contraseña debe tener al menos 8 caracteres',
      400
    );
  }

  const response = await auth.api.changePassword({
    body: {
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      revokeOtherSessions: dto.revokeOtherSessions ?? false,
    },
    headers: fromNodeHeaders(rawHeaders),
    asResponse: true,
  });

  if (!response.ok) {
    const errorBody: any = await response.json().catch(() => ({}));
    throw new AuthError(
      errorBody.message || 'Error al actualizar la contraseña',
      response.status || 400
    );
  }

  const setCookieHeaders = extractSetCookies(response);
  return { setCookieHeaders };
};

/**
 * Actualización de perfil del usuario autenticado.
 */
export const updateProfile = async (
  userId: string,
  dto: UpdateProfileDTO
): Promise<AuthenticatedUser> => {
  const updateData: any = {};

  if (dto.name !== undefined) {
    if (!dto.name.trim()) {
      throw new AuthError('El nombre no puede estar vacío', 400);
    }
    updateData.name = dto.name.trim();
  }

  if (dto.lastName !== undefined) {
    updateData.lastName = dto.lastName ? dto.lastName.trim() : null;
  }

  if (dto.phone !== undefined) {
    updateData.phone = dto.phone ? dto.phone.trim() : null;
  }

  if (dto.image !== undefined) {
    updateData.image = dto.image ? dto.image.trim() : null;
  }

  if (dto.username !== undefined) {
    const trimmedUsername = dto.username
      ? dto.username.trim().toLowerCase()
      : null;
    if (trimmedUsername) {
      if (trimmedUsername.length < 3) {
        throw new AuthError(
          'El nombre de usuario debe tener al menos 3 caracteres',
          400
        );
      }
      const existing = await prisma.user.findFirst({
        where: {
          username: trimmedUsername,
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new AuthError('El nombre de usuario ya está en uso', 409);
      }
    }
    updateData.username = trimmedUsername;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  const updatedUser = await getUserWithRolesAndPermissions(userId);
  if (!updatedUser) {
    throw new AuthError('Error al recuperar el usuario actualizado', 500);
  }

  return updatedUser;
};
