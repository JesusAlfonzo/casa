import type { SaleTransaction } from "./pos";

export interface CustomerCount {
  sales: number;
  subscriptions: number;
}

export interface Customer {
  id: string;
  name: string;
  lastName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _count?: CustomerCount;
}

export interface CustomerSubscriptionDetail {
  id: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
  startDate: string;
  expirationDate: string;
  agreedPrice: number | string;
  billingPeriod: string;
  service?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  streamingAccount?: {
    id: string;
    accessEmail: string;
    supplierCutoffDate?: string | null;
  } | null;
  streamingProfile?: {
    id: string;
    slotNumber: number;
    profileName: string;
    profilePin?: string | null;
  } | null;
}

export interface CustomerWithDetails extends Customer {
  subscriptions: CustomerSubscriptionDetail[];
  sales?: SaleTransaction[];
}

export interface CreateCustomerDTO {
  name: string;
  lastName?: string;
  documentId?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export type UpdateCustomerDTO = Partial<CreateCustomerDTO>;

export interface CustomerQueryParams {
  search?: string;
  phone?: string;
  documentId?: string;
  email?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "name" | "lastName" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedCustomersResult {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
