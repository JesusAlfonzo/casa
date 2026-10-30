export interface CreateSupplierDTO {
  legalName: string;
  tradeName?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierDTO {
  legalName?: string;
  tradeName?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface SupplierQueryDTO {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'legalName' | 'tradeName' | 'taxId' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierWithCount {
  id: string;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count?: {
    products: number;
    purchases: number;
    streamingAccounts: number;
  };
}

export interface SupplierDetail extends SupplierWithCount {
  products?: Array<{
    id: string;
    supplierSku: string | null;
    lastCost: any;
    isPrimarySupplier: boolean;
    product: {
      id: string;
      sku: string;
      name: string;
      baseSalePrice: any;
      averageCost: any;
    };
  }>;
  purchases?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: any;
    purchasedAt: Date;
    currency: {
      id: string;
      code: string;
      symbol: string;
    };
  }>;
}

export interface PaginatedSuppliersResult {
  data: SupplierWithCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
