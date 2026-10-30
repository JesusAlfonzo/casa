import { type Customer, type Subscription, type Sale } from '@prisma/client';

export interface CreateCustomerDTO {
  name: string;
  lastName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateCustomerDTO {
  name?: string;
  lastName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerQueryDTO {
  search?: string;
  phone?: string;
  documentId?: string;
  email?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'lastName' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerWithDetails extends Customer {
  subscriptions?: Subscription[];
  _count?: {
    sales: number;
    subscriptions: number;
  };
}

export interface PaginatedCustomersResult {
  items: CustomerWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
