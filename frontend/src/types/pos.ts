export type PosItemType = "PRODUCT" | "SERVICE" | "SUBSCRIPTION";

export interface CartItem {
  tempId: string;
  itemType: PosItemType;
  productId?: string;
  serviceId?: string;
  name: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxPercentage: number;
  subtotal: number;
  stock?: number;
  categoryName?: string;
}

export interface PaymentEntry {
  tempId: string;
  financialAccountId: string;
  paymentMethodId: string;
  amount: number;
  currencyId: string;
  reference?: string;
  notes?: string;
  accountName?: string;
  methodName?: string;
  currencyCode?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  decimals: number;
}

export interface ExchangeRate {
  id: string;
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: number | string;
  source?: string | null;
  isActive: boolean;
  sourceCurrency?: Currency;
  targetCurrency?: Currency;
}

export interface PaymentMethod {
  id: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  currencyId: string;
  currentBalance: number | string;
  currency?: Currency;
  paymentMethods?: Array<{
    paymentMethodId: string;
    paymentMethod: PaymentMethod;
  }>;
}

export interface Customer {
  id: string;
  name: string;
  lastName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  baseSalePrice: number | string;
  minStockAlert: number | string;
  category?: {
    id: string;
    name: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  inventories?: Array<{
    id: string;
    currentQuantity: number | string;
    reservedQuantity: number | string;
  }>;
}

export interface ServiceCatalogItem {
  id: string;
  code: string;
  name: string;
  basePrice: number | string;
  defaultDurationDays?: number | null;
  requiresStreamingAccount: boolean;
  serviceType?: {
    name: string;
  };
}

export interface SaleTransaction {
  id: string;
  documentNumber?: string;
  orderNumber?: string;
  status: "QUOTE" | "PENDING_PAYMENT" | "PARTIALLY_PAID" | "COMPLETED" | "VOIDED";
  outputType: "SALE" | "INTERNAL_CONSUMPTION" | "SHRINKAGE" | "OUTBOUND_ADJUSTMENT";
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  total: number | string;
  totalPaid: number | string;
  soldAt: string;
  notes?: string | null;
  customer?: Customer | null;
  currency?: Currency;
  items: Array<{
    id: string;
    itemType: PosItemType;
    description?: string | null;
    quantity: number | string;
    unitPrice: number | string;
    discountAmount: number | string;
    subtotal: number | string;
    product?: {
      id: string;
      name: string;
      sku: string;
    } | null;
    service?: {
      id: string;
      name: string;
    } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number | string;
    reference?: string | null;
    paidAt: string;
    paymentMethod?: {
      name: string;
    } | null;
    financialAccount?: {
      name: string;
    } | null;
  }>;
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
