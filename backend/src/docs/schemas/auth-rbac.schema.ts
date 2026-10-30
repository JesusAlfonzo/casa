export const authRbacSchemas = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Administrador Principal' },
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@erphibrido.com',
      },
      emailVerified: { type: 'boolean', example: true },
      image: { type: 'string', nullable: true, example: null },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  SignUpDTO: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', example: 'Juan Pérez' },
      email: {
        type: 'string',
        format: 'email',
        example: 'juan.perez@erphibrido.com',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'PasswordSegura123!',
      },
      image: { type: 'string', nullable: true },
    },
  },
  SignInDTO: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'admin@erphibrido.com',
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'AdminPassword123!',
      },
    },
  },
  ChangePasswordDTO: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: {
        type: 'string',
        format: 'password',
        example: 'AdminPassword123!',
      },
      newPassword: {
        type: 'string',
        format: 'password',
        example: 'NuevaPassword456!',
      },
    },
  },
  UpdateProfileDTO: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Juan Pérez Actualizado' },
      image: { type: 'string', nullable: true },
    },
  },
  Role: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'ADMIN' },
      description: {
        type: 'string',
        example: 'Acceso total y administración de la plataforma',
      },
      isSystem: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateRoleDTO: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'SUPERVISOR' },
      description: {
        type: 'string',
        example: 'Supervisa cajas y auditorías de inventario',
      },
      permissionIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: 'Lista opcional de IDs de permisos a asociar inicialmente',
      },
    },
  },
  UpdateRoleDTO: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'SUPERVISOR_GENERAL' },
      description: {
        type: 'string',
        example: 'Descripción actualizada del rol',
      },
      permissionIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
    },
  },
  Permission: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'sales.create' },
      module: { type: 'string', example: 'sales' },
      description: {
        type: 'string',
        example: 'Emitir y cobrar ventas en el sistema',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  AssignRolesDTO: {
    type: 'object',
    required: ['roleIds'],
    properties: {
      roleIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
      },
    },
  },
  SetPermissionsDTO: {
    type: 'object',
    required: ['permissions'],
    properties: {
      permissions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['permissionId', 'granted'],
          properties: {
            permissionId: { type: 'string', format: 'uuid' },
            granted: { type: 'boolean', example: true },
          },
        },
      },
    },
  },
};
