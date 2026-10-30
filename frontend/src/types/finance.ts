export type FinancialAccountType =
  | "DOMESTIC_BANK"
  | "INTERNATIONAL_BANK"
  | "DIGITAL_WALLET"
  | "CASH_REGISTER";

export type PaymentFlowType = "INFLOW" | "OUTFLOW";

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "REFUNDED";

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  decimals: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    financialAccounts?: number;
    purchases?: number;
    sales?: number;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  requiresReference: boolean;
  isActive: boolean;
}

export interface FinancialAccountPaymentMethod {
  id: string;
  financialAccountId: string;
  paymentMethodId: string;
  isActive: boolean;
  paymentMethod: PaymentMethod;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: FinancialAccountType;
  bankName: string | null;
  accountNumber: string | null;
  holderName: string | null;
  identifier: string | null;
  currencyId: string;
  currentBalance: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currency?: Currency;
  paymentMethods?: FinancialAccountPaymentMethod[];
  _count?: {
    paymentMethods?: number;
    paymentTransactions?: number;
  };
}

export interface CreateFinancialAccountDTO {
  name: string;
  type: FinancialAccountType;
  bankName?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  identifier?: string | null;
  currencyId: string;
  initialBalance?: number;
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

export interface AdjustBalanceDTO {
  newBalance: number;
  reason: string;
}

export interface PaymentTransaction {
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
  amount: number | string;
  baseCurrencyAmount: number | string;
  reference: string | null;
  receiptUrl: string | null;
  notes: string | null;
  paidAt: string;
  createdAt: string;
  financialAccount?: {
    id: string;
    name: string;
    type: FinancialAccountType;
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
    rate: number | string;
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
    total: number | string;
    totalPaid: number | string;
  } | null;
}

export interface CreatePaymentTransactionDTO {
  flowType: PaymentFlowType;
  status?: PaymentStatus;
  financialAccountId: string;
  paymentMethodId: string;
  currencyId?: string;
  amount: number;
  reference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  paidAt?: string;
  purchaseId?: string | null;
  saleId?: string | null;
}

export interface ExchangeRate {
  id: string;
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: number | string;
  source: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  sourceCurrency?: Currency;
  targetCurrency?: Currency;
  _count?: {
    purchases?: number;
    sales?: number;
    paymentTransactions?: number;
  };
}

export interface CreateExchangeRateDTO {
  sourceCurrencyId: string;
  targetCurrencyId: string;
  rate: number;
  source?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
}
