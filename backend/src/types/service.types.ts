import { Prisma, type Service, type ServiceType } from '@prisma/client';

export interface CreateServiceTypeDTO {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateServiceTypeDTO {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface ServiceTypeQueryDTO {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceTypeWithDetails extends ServiceType {
  _count?: {
    services: number;
  };
}

export interface PaginatedServiceTypesResult {
  items: ServiceTypeWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateServiceDTO {
  code?: string;
  name: string;
  description?: string | null;
  serviceTypeId: string;
  basePrice: number | string | Prisma.Decimal;
  defaultDurationDays?: number | null;
  requiresStreamingAccount?: boolean;
  isFullAccountSale?: boolean;
  isActive?: boolean;
}

export interface UpdateServiceDTO {
  code?: string;
  name?: string;
  description?: string | null;
  serviceTypeId?: string;
  basePrice?: number | string | Prisma.Decimal;
  defaultDurationDays?: number | null;
  requiresStreamingAccount?: boolean;
  isFullAccountSale?: boolean;
  isActive?: boolean;
}

export interface ServiceQueryDTO {
  search?: string;
  serviceTypeId?: string;
  requiresStreamingAccount?: boolean;
  isFullAccountSale?: boolean;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?:
    | 'name'
    | 'code'
    | 'basePrice'
    | 'defaultDurationDays'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceWithDetails extends Service {
  serviceType: ServiceType;
  _count?: {
    streamingAccounts: number;
    subscriptions: number;
    purchaseItems: number;
    saleItems: number;
  };
}

export interface PaginatedServicesResult {
  items: ServiceWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
