import {
  Prisma,
  type Sale,
  type SaleItem,
  type SaleOutputType,
  type SaleStatus,
  type SaleItemType,
  type Customer,
  type User,
  type Currency,
  type ExchangeRate,
  type PaymentTransaction,
  type Product,
  type Service,
  type Subscription,
  type Inventory,
} from '@prisma/client';

export interface CreateSaleItemDTO {
  itemType: SaleItemType;
  productId?: string | null;
  inventoryId?: string | null;
  serviceId?: string | null;
  subscriptionId?: string | null;
  description?: string;
  quantity?: number | string | Prisma.Decimal;
  unitPrice?: number | string | Prisma.Decimal;
  discountAmount?: number | string | Prisma.Decimal;
  taxPercentage?: number | string | Prisma.Decimal;
}

export interface CreateSalePaymentDTO {
  financialAccountId: string;
  paymentMethodId: string;
  amount: number | string | Prisma.Decimal;
  currencyId?: string;
  exchangeRateId?: string | null;
  reference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  paidAt?: Date | string;
}

export interface CreateSaleDTO {
  documentNumber?: string;
  outputType?: SaleOutputType;
  status?: SaleStatus;
  customerId?: string | null;
  currencyId: string;
  exchangeRateId?: string | null;
  exchangeRateValue?: number | string | Prisma.Decimal;
  discountAmount?: number | string | Prisma.Decimal;
  soldAt?: Date | string;
  notes?: string | null;
  items: CreateSaleItemDTO[];
  payments?: CreateSalePaymentDTO[];
}

export interface SaleQueryDTO {
  search?: string;
  documentNumber?: string;
  customerId?: string;
  userId?: string;
  currencyId?: string;
  outputType?: SaleOutputType;
  status?: SaleStatus;
  itemType?: SaleItemType;
  productId?: string;
  serviceId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
  sortBy?:
    'soldAt' | 'total' | 'totalCollected' | 'documentNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SaleItemWithDetails extends SaleItem {
  product?: Product | null;
  service?: Service | null;
  subscription?: Subscription | null;
  inventory?: Inventory | null;
}

export interface SaleWithDetails extends Sale {
  orderNumber?: string;
  customer: Customer | null;
  user: User | null;
  currency: Currency;
  exchangeRate: ExchangeRate | null;
  items: SaleItemWithDetails[];
  payments: PaymentTransaction[];
  _count?: {
    items: number;
    payments: number;
  };
}

export interface PaginatedSalesResult {
  items: SaleWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleStats {
  totalSales: number;
  completedSales: number;
  pendingSales: number;
  voidedSales: number;
  totalInvoiced: number;
  totalCollected: number;
  totalPendingBalance: number;
  salesTodayCount: number;
  salesTodayAmount: number;
}
