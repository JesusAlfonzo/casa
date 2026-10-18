import { Prisma } from '@prisma/client';

export interface CreateProductDTO {
  sku?: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  measurementUnitId: string;
  brandId?: string | null;
  categoryId: string;
  averageCost?: number | string | Prisma.Decimal;
  baseSalePrice: number | string | Prisma.Decimal;
  wholesalePrice?: number | string | Prisma.Decimal | null;
  minStockAlert?: number | string | Prisma.Decimal;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateProductDTO {
  sku?: string;
  barcode?: string | null;
  name?: string;
  description?: string | null;
  measurementUnitId?: string;
  brandId?: string | null;
  categoryId?: string;
  averageCost?: number | string | Prisma.Decimal;
  baseSalePrice?: number | string | Prisma.Decimal;
  wholesalePrice?: number | string | Prisma.Decimal | null;
  minStockAlert?: number | string | Prisma.Decimal;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ProductQueryDTO {
  search?: string;
  categoryId?: string;
  brandId?: string;
  measurementUnitId?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?:
    | 'name'
    | 'sku'
    | 'baseSalePrice'
    | 'averageCost'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductInventorySummary {
  id: string;
  locationId: string;
  currentQuantity: Prisma.Decimal | number;
  reservedQuantity: Prisma.Decimal | number;
  specificLocation: string | null;
  location: {
    id: string;
    code: string;
    name: string;
  };
}

export interface ProductWithDetails {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  measurementUnitId: string;
  brandId: string | null;
  categoryId: string;
  averageCost: Prisma.Decimal | number;
  baseSalePrice: Prisma.Decimal | number;
  wholesalePrice: Prisma.Decimal | number | null;
  minStockAlert: Prisma.Decimal | number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  measurementUnit?: {
    id: string;
    name: string;
    abbreviation: string;
    allowsDecimals: boolean;
  };
  brand?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  inventories?: ProductInventorySummary[];
  _count?: {
    inventories: number;
    purchaseItems: number;
    saleItems: number;
    suppliers: number;
  };
}

export interface PaginatedProductsResult {
  data: ProductWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
