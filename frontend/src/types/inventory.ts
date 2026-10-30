export interface MeasurementUnit {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  allowsDecimals: boolean;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface Category {
  id: string;
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Category | null;
  children?: Category[];
  _count?: {
    products: number;
  };
}

export interface LocationWarehouse {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventories: number;
  };
}

export interface InventoryItemStock {
  id: string;
  locationId: string;
  currentQuantity: number | string;
  reservedQuantity: number | string;
  specificLocation?: string | null;
  location?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  measurementUnitId: string;
  brandId?: string | null;
  categoryId: string;
  averageCost: number | string;
  baseSalePrice: number | string;
  wholesalePrice?: number | string | null;
  minStockAlert: number | string;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  measurementUnit?: MeasurementUnit;
  brand?: Brand | null;
  category?: Category;
  inventories?: InventoryItemStock[];
  _count?: {
    inventories: number;
    purchaseItems: number;
    saleItems: number;
    suppliers: number;
  };
}

export interface CreateProductDTO {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  measurementUnitId: string;
  brandId?: string;
  categoryId: string;
  averageCost?: number | string;
  baseSalePrice: number | string;
  wholesalePrice?: number | string;
  minStockAlert?: number | string;
  imageUrl?: string;
  isActive?: boolean;
}

export type UpdateProductDTO = Partial<CreateProductDTO>;

export type InventoryMovementType =
  | "INITIAL_LOAD"
  | "PURCHASE_RECEIPT"
  | "SALE_DELIVERY"
  | "POSITIVE_ADJUSTMENT"
  | "NEGATIVE_ADJUSTMENT"
  | "SHRINKAGE_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "CUSTOMER_RETURN"
  | "SUPPLIER_RETURN";

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  productId: string;
  movementType: InventoryMovementType;
  quantity: number | string;
  previousStock: number | string;
  resultingStock: number | string;
  unitCost?: number | string | null;
  reason?: string | null;
  movedAt: string;
  user?: {
    id: string;
    name: string;
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

export interface AdjustStockDTO {
  productId: string;
  locationId: string;
  type: "POSITIVE_ADJUSTMENT" | "NEGATIVE_ADJUSTMENT" | "SHRINKAGE_OUT";
  quantity: number | string;
  unitCost?: number | string;
  reason: string;
}

export interface TransferStockDTO {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number | string;
  reason?: string;
}

export interface Supplier {
  id: string;
  legalName: string;
  tradeName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export type PurchaseStatus =
  | "DRAFT"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId?: string | null;
  serviceId?: string | null;
  destinationLocationId?: string | null;
  description?: string | null;
  quantity: number | string;
  receivedQuantity: number | string;
  unitCost: number | string;
  taxPercentage: number | string;
  discountAmount: number | string;
  subtotal: number | string;
  product?: {
    id: string;
    sku: string;
    name: string;
    measurementUnit?: {
      id: string;
      name: string;
      abbreviation: string;
    };
  } | null;
  destinationLocation?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface Purchase {
  id: string;
  orderNumber: string;
  supplierInvoiceNumber?: string | null;
  supplierId: string;
  currencyId: string;
  exchangeRateValue: number | string;
  status: PurchaseStatus;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  total: number | string;
  totalPaid: number | string;
  purchasedAt: string;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  items?: PurchaseItem[];
  _count?: {
    items: number;
    payments: number;
  };
}

export interface CreatePurchaseItemInput {
  productId?: string;
  destinationLocationId?: string;
  description?: string;
  quantity: number;
  unitCost: number;
  taxPercentage?: number;
  discountAmount?: number;
}

export interface CreatePurchaseDTO {
  supplierId: string;
  supplierInvoiceNumber?: string;
  currencyId: string;
  purchasedAt?: string;
  notes?: string;
  receiveOnCreate?: boolean;
  items: CreatePurchaseItemInput[];
}
