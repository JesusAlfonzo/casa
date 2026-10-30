export interface SupplierItem {
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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    products: number;
    purchases: number;
    streamingAccounts: number;
  };
}

export interface SupplierProductItem {
  id: string;
  supplierSku?: string | null;
  supplierProductCode?: string | null;
  lastCost: number | string | null;
  isPrimarySupplier?: boolean;
  isPrimary?: boolean;
  leadTimeDays?: number | null;
  product: {
    id: string;
    sku: string;
    name: string;
    baseSalePrice: number | string;
    averageCost: number | string;
  };
  currency?: {
    id: string;
    code: string;
    symbol: string;
  } | null;
}

export interface SupplierPurchaseItem {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  purchasedAt: string;
  currency: {
    id: string;
    code: string;
    symbol: string;
  };
  warehouse?: {
    id: string;
    name: string;
  } | null;
}

export interface SupplierDetail extends SupplierItem {
  products?: SupplierProductItem[];
  purchases?: SupplierPurchaseItem[];
}

export interface PaginatedSuppliersResponse {
  success: boolean;
  data: SupplierItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateSupplierDTO {
  legalName: string;
  tradeName?: string;
  taxId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDTO {
  legalName?: string;
  tradeName?: string;
  taxId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface AssignSupplierProductDTO {
  supplierId: string;
  productId: string;
  supplierProductCode?: string;
  lastCost?: number;
  currencyId?: string;
  isPrimary?: boolean;
  leadTimeDays?: number;
}
