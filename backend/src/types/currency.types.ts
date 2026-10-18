export interface CreateCurrencyDTO {
  code: string;
  name: string;
  symbol: string;
  isBase?: boolean;
  decimals?: number;
  isActive?: boolean;
}

export interface UpdateCurrencyDTO {
  code?: string;
  name?: string;
  symbol?: string;
  isBase?: boolean;
  decimals?: number;
  isActive?: boolean;
}

export interface CurrencyQueryDTO {
  search?: string;
  isActive?: boolean;
  isBase?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'code' | 'name' | 'isBase' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CurrencyWithCount {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  decimals: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    financialAccounts: number;
    purchases: number;
    sales: number;
    sourceExchangeRates: number;
    targetExchangeRates: number;
  };
}

export interface PaginatedCurrenciesResult {
  data: CurrencyWithCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
