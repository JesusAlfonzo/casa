import { Prisma, PurchaseStatus } from '@prisma/client';

export interface CreatePurchaseItemDTO {
  productId?: string | null;
  serviceId?: string | null;
  destinationLocationId?: string | null;
  description?: string | null;
  quantity: number | string | Prisma.Decimal;
  unitCost: number | string | Prisma.Decimal;
  taxPercentage?: number | string | Prisma.Decimal;
  discountAmount?: number | string | Prisma.Decimal;
}

export interface CreatePurchaseDTO {
  orderNumber?: string;
  supplierInvoiceNumber?: string | null;
  supplierId: string;
  currencyId: string;
  exchangeRateId?: string | null;
  exchangeRateValue?: number | string | Prisma.Decimal;
  status?: PurchaseStatus;
  purchasedAt?: string | Date;
  dueDate?: string | Date | null;
  notes?: string | null;
  receiveOnCreate?: boolean; // Si es true, ingresa la mercancía al almacén inmediatamente
  items: CreatePurchaseItemDTO[];
}

export interface UpdatePurchaseDTO {
  supplierInvoiceNumber?: string | null;
  dueDate?: string | Date | null;
  notes?: string | null;
  status?: PurchaseStatus;
}

export interface ReceivePurchaseItemInput {
  purchaseItemId: string;
  receivedQuantity: number | string | Prisma.Decimal;
  destinationLocationId?: string;
}

export interface ReceivePurchaseItemsDTO {
  items?: ReceivePurchaseItemInput[]; // Si está vacío, se da por recibido el 100% pendiente
}

export interface PurchaseQueryDTO {
  supplierId?: string;
  status?: PurchaseStatus;
  currencyId?: string;
  search?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
  page?: number;
  limit?: number;
  sortBy?: 'orderNumber' | 'purchasedAt' | 'total' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseItemWithDetails {
  id: string;
  purchaseId: string;
  productId: string | null;
  serviceId: string | null;
  destinationLocationId: string | null;
  description: string | null;
  quantity: Prisma.Decimal | number;
  receivedQuantity: Prisma.Decimal | number;
  unitCost: Prisma.Decimal | number;
  taxPercentage: Prisma.Decimal | number;
  discountAmount: Prisma.Decimal | number;
  subtotal: Prisma.Decimal | number;
  product?: {
    id: string;
    sku: string;
    name: string;
    measurementUnit: {
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

export interface PurchaseWithDetails {
  id: string;
  orderNumber: string;
  supplierInvoiceNumber: string | null;
  supplierId: string;
  userId: string | null;
  currencyId: string;
  exchangeRateId: string | null;
  exchangeRateValue: Prisma.Decimal | number;
  status: PurchaseStatus;
  subtotal: Prisma.Decimal | number;
  taxAmount: Prisma.Decimal | number;
  discountAmount: Prisma.Decimal | number;
  total: Prisma.Decimal | number;
  totalPaid: Prisma.Decimal | number;
  purchasedAt: Date;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplier?: {
    id: string;
    legalName: string;
    tradeName: string | null;
    taxId: string | null;
    phone: string | null;
    email: string | null;
  };
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  exchangeRate?: {
    id: string;
    rate: Prisma.Decimal | number;
    source: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  items?: PurchaseItemWithDetails[];
  _count?: {
    items: number;
    payments: number;
    streamingAccounts: number;
  };
}

export interface PaginatedPurchasesResult {
  data: PurchaseWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
