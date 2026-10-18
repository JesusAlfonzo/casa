import { Prisma } from '@prisma/client';

export interface AssignSupplierProductDTO {
  supplierId: string;
  productId: string;
  supplierSku?: string | null;
  lastCost?: number | string | Prisma.Decimal | null;
  isPrimarySupplier?: boolean;
}

export interface UpdateSupplierProductDTO {
  supplierSku?: string | null;
  lastCost?: number | string | Prisma.Decimal | null;
  isPrimarySupplier?: boolean;
}

export interface SupplierProductQueryDTO {
  supplierId?: string;
  productId?: string;
  search?: string;
  isPrimarySupplier?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'lastCost';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierProductWithDetails {
  id: string;
  supplierId: string;
  productId: string;
  supplierSku: string | null;
  lastCost: Prisma.Decimal | number | null;
  isPrimarySupplier: boolean;
  updatedAt: Date;
  supplier?: {
    id: string;
    legalName: string;
    tradeName: string | null;
    taxId: string | null;
    phone: string | null;
    email: string | null;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    baseSalePrice: Prisma.Decimal | number;
    averageCost: Prisma.Decimal | number;
  };
}

export interface PaginatedSupplierProductsResult {
  data: SupplierProductWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
