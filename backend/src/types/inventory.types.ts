import { Prisma, InventoryMovementType } from '@prisma/client';

export interface AdjustStockDTO {
  productId: string;
  locationId: string;
  type: 'POSITIVE_ADJUSTMENT' | 'NEGATIVE_ADJUSTMENT' | 'SHRINKAGE_OUT';
  quantity: number | string | Prisma.Decimal;
  unitCost?: number | string | Prisma.Decimal | null;
  reason: string;
  userId?: string | null;
}

export interface TransferStockDTO {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number | string | Prisma.Decimal;
  reason?: string | null;
  userId?: string | null;
}

export interface UpdateInventoryDTO {
  specificLocation?: string | null;
}

export interface InventoryQueryDTO {
  productId?: string;
  locationId?: string;
  categoryId?: string;
  brandId?: string;
  search?: string;
  lowStock?: boolean;
  hasStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'currentQuantity' | 'reservedQuantity' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryMovementQueryDTO {
  inventoryId?: string;
  productId?: string;
  locationId?: string;
  movementType?: InventoryMovementType;
  fromDate?: string | Date;
  toDate?: string | Date;
  page?: number;
  limit?: number;
  sortBy?: 'movedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryWithDetails {
  id: string;
  productId: string;
  locationId: string;
  currentQuantity: Prisma.Decimal | number;
  reservedQuantity: Prisma.Decimal | number;
  availableQuantity?: Prisma.Decimal | number;
  specificLocation: string | null;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    minStockAlert: Prisma.Decimal | number;
    baseSalePrice: Prisma.Decimal | number;
    averageCost: Prisma.Decimal | number;
    measurementUnit: {
      id: string;
      name: string;
      abbreviation: string;
      allowsDecimals: boolean;
    };
    category?: {
      id: string;
      name: string;
      slug: string;
    };
    brand?: {
      id: string;
      name: string;
    } | null;
  };
  location?: {
    id: string;
    code: string;
    name: string;
    address: string | null;
  };
}

export interface InventoryMovementWithDetails {
  id: string;
  inventoryId: string;
  productId: string;
  movementType: InventoryMovementType;
  quantity: Prisma.Decimal | number;
  previousStock: Prisma.Decimal | number;
  resultingStock: Prisma.Decimal | number;
  unitCost: Prisma.Decimal | number | null;
  purchaseItemId: string | null;
  saleItemId: string | null;
  userId: string | null;
  reason: string | null;
  movedAt: Date;
  user?: {
    id: string;
    name: string;
    lastName: string | null;
    email: string;
  } | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  inventory?: {
    id: string;
    location: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface PaginatedInventoriesResult {
  data: InventoryWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginatedInventoryMovementsResult {
  data: InventoryMovementWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
