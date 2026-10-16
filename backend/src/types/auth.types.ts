import { type Request } from 'express';

export interface SignUpDTO {
  email: string;
  password: string;
  name: string;
  lastName?: string;
  username?: string;
  phone?: string;
  roleName?: string;
}

export interface SignInDTO {
  email?: string;
  username?: string;
  identifier?: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

export interface UpdateProfileDTO {
  name?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  image?: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  session?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  user?: AuthenticatedUser;
  roles?: string[];
  permissions?: string[];
}
