export interface CreatePaymentMethodDTO {
  name: string;
  requiresReference?: boolean;
  isActive?: boolean;
}

export interface UpdatePaymentMethodDTO {
  name?: string;
  requiresReference?: boolean;
  isActive?: boolean;
}

export interface PaymentMethodQueryDTO {
  search?: string;
  isActive?: boolean;
  requiresReference?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentMethodWithCount {
  id: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    financialAccounts: number;
    paymentTransactions: number;
  };
}

export interface PaginatedPaymentMethodsResult {
  data: PaymentMethodWithCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
