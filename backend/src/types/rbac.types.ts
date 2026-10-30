import { type Role, type Permission } from '@prisma/client';

export interface UserQueryDTO {
  search?: string;
  roleId?: string;
  roleName?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
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
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  directPermissionsCount: number;
}

export interface PaginatedUsersResult {
  items: UserSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignUserRolesDTO {
  roleIds: string[];
}

export interface CreateUserDTO {
  name: string;
  lastName?: string | null;
  email: string;
  username?: string | null;
  phone?: string | null;
  password: string;
  roleIds?: string[];
}

export interface UserDirectPermissionItemDTO {
  permissionId: string;
  isGranted?: boolean;
}

export interface AssignUserPermissionsDTO {
  permissions: UserDirectPermissionItemDTO[];
}

export interface CreateRoleDTO {
  name: string;
  description?: string | null;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface UpdateRoleDTO {
  name?: string;
  description?: string | null;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface RoleQueryDTO {
  search?: string;
  isActive?: boolean;
}

export interface RoleWithDetails extends Role {
  permissions: Array<{
    permission: Permission;
    assignedAt: Date;
  }>;
  _count?: {
    users: number;
    permissions: number;
  };
}

export interface PermissionQueryDTO {
  module?: string;
  search?: string;
}

export interface ModulePermissionsGroup {
  module: string;
  permissions: Permission[];
}
