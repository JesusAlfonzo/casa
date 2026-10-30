export interface RoleReference {
  id: string;
  name: string;
  description: string | null;
}

export interface UserSummaryItem {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  username: string | null;
  phone: string | null;
  image: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: RoleReference[];
  directPermissionsCount: number;
}

export interface PaginatedUsersResponse {
  success: boolean;
  items: UserSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModulePermissionsGroup {
  module: string;
  permissions: PermissionItem[];
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Array<{
    permission: PermissionItem;
    assignedAt: string;
  }>;
  _count?: {
    users: number;
    permissions: number;
  };
}

export interface UserDetail {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  username: string | null;
  phone: string | null;
  image: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: Array<{
    assignedAt: string;
    role: {
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      permissions: Array<{
        permission: {
          id: string;
          code: string;
          name: string;
          module: string;
        };
      }>;
    };
  }>;
  directPermissions: Array<{
    isGranted: boolean;
    assignedAt: string;
    permission: {
      id: string;
      code: string;
      name: string;
      module: string;
      description: string | null;
    };
  }>;
  _count: {
    sales: number;
    purchases: number;
    paymentTransactions: number;
    inventoryMovements: number;
  };
}

export interface CreateUserDTO {
  name: string;
  lastName?: string;
  email: string;
  username?: string;
  phone?: string;
  password: string;
  roleIds?: string[];
}

export interface AssignUserRolesDTO {
  roleIds: string[];
}

export interface CreateRoleDTO {
  name: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}
