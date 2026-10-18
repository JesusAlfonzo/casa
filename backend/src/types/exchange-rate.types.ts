import { Prisma } from '@prisma/client';

export interface CreateExchangeRateDTO {
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: number | string | Prisma.Decimal;
  source?: string | null;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
  isActive?: boolean;
}

export interface UpdateExchangeRateDTO {
  rate?: number | string | Prisma.Decimal;
  source?: string | null;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
  isActive?: boolean;
}

export interface ExchangeRateQueryDTO {
  sourceCurrencyId?: string;
  targetCurrencyId?: string;
  source?: string;
  isActive?: boolean;
  onlyCurrent?: boolean; // effectiveTo is null and isActive is true
  fromDate?: string | Date;
  toDate?: string | Date;
  page?: number;
  limit?: number;
  sortBy?: 'effectiveFrom' | 'rate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ExchangeRateWithDetails {
  id: string;
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: Prisma.Decimal | number;
  source: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  sourceCurrency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  targetCurrency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  _count?: {
    purchases: number;
    sales: number;
    paymentTransactions: number;
  };
}

export interface PaginatedExchangeRatesResult {
  data: ExchangeRateWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
