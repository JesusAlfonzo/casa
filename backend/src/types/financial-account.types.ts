import { Prisma, type FinancialAccountType } from '@prisma/client';

export interface CreateFinancialAccountDTO {
  name: string;
  type?: FinancialAccountType;
  bankName?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  identifier?: string | null;
  currencyId: string;
  initialBalance?: number | string | Prisma.Decimal;
  paymentMethodIds?: string[];
  isActive?: boolean;
}

export interface UpdateFinancialAccountDTO {
  name?: string;
  type?: FinancialAccountType;
  bankName?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  identifier?: string | null;
  paymentMethodIds?: string[];
  isActive?: boolean;
}

export interface FinancialAccountQueryDTO {
  search?: string;
  type?: FinancialAccountType;
  currencyId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'currentBalance' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FinancialAccountWithDetails {
  id: string;
  name: string;
  type: FinancialAccountType;
  bankName: string | null;
  accountNumber: string | null;
  holderName: string | null;
  identifier: string | null;
  currencyId: string;
  currentBalance: Prisma.Decimal | number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  paymentMethods?: {
    id: string;
    paymentMethodId: string;
    isActive: boolean;
    paymentMethod: {
      id: string;
      name: string;
      requiresReference: boolean;
    };
  }[];
  _count?: {
    paymentMethods: number;
    paymentTransactions: number;
  };
}

export interface PaginatedFinancialAccountsResult {
  data: FinancialAccountWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
