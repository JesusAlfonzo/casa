import { Prisma, PaymentFlowType, PaymentStatus } from '@prisma/client';

export interface CreatePaymentTransactionDTO {
  flowType: PaymentFlowType;
  status?: PaymentStatus;
  purchaseId?: string | null;
  saleId?: string | null;
  financialAccountId: string;
  paymentMethodId: string;
  currencyId?: string; // Si no se envía, hereda la moneda de la cuenta financiera
  exchangeRateId?: string | null;
  amount: number | string | Prisma.Decimal;
  reference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  paidAt?: string | Date;
}

export interface PaymentTransactionQueryDTO {
  flowType?: PaymentFlowType;
  status?: PaymentStatus;
  purchaseId?: string;
  saleId?: string;
  financialAccountId?: string;
  paymentMethodId?: string;
  currencyId?: string;
  search?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
  page?: number;
  limit?: number;
  sortBy?: 'paidAt' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentTransactionWithDetails {
  id: string;
  flowType: PaymentFlowType;
  status: PaymentStatus;
  purchaseId: string | null;
  saleId: string | null;
  financialAccountId: string;
  paymentMethodId: string;
  currencyId: string;
  exchangeRateId: string | null;
  userId: string | null;
  amount: Prisma.Decimal | number;
  baseCurrencyAmount: Prisma.Decimal | number;
  reference: string | null;
  receiptUrl: string | null;
  notes: string | null;
  paidAt: Date;
  createdAt: Date;
  financialAccount?: {
    id: string;
    name: string;
    type: string;
    bankName: string | null;
  };
  paymentMethod?: {
    id: string;
    name: string;
    requiresReference: boolean;
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
  purchase?: {
    id: string;
    orderNumber: string;
    total: Prisma.Decimal | number;
    totalPaid: Prisma.Decimal | number;
  } | null;
}

export interface PaginatedPaymentTransactionsResult {
  data: PaymentTransactionWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
