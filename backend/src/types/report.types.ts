export interface SalesReportQueryDTO {
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
}

export interface SalesReportItem {
  id: string;
  documentNumber: string;
  orderNumber: string;
  soldAt: Date;
  customerName: string;
  customerTaxId: string | null;
  status: string;
  itemsCount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  totalCollected: number;
  balancePending: number;
  currencyCode: string;
  paymentMethods: string[];
}

export interface SalesReportResult {
  summary: {
    totalSalesCount: number;
    totalInvoiced: number;
    totalCollected: number;
    totalPending: number;
    averageTicket: number;
  };
  items: SalesReportItem[];
}

export interface InventoryValuationItem {
  id: string;
  sku: string;
  barcode: string | null;
  productName: string;
  categoryName: string;
  warehouseName: string;
  currentStock: number;
  averageCost: number;
  totalCostValuation: number;
  baseSalePrice: number;
  totalRetailValuation: number;
  projectedProfit: number;
  profitMarginPercent: number;
}

export interface InventoryReportResult {
  summary: {
    totalStockUnits: number;
    totalProductsListed: number;
    totalCostValuation: number;
    totalRetailValuation: number;
    projectedGrossProfit: number;
    averageMarginPercent: number;
  };
  items: InventoryValuationItem[];
}

export interface CashflowReportResult {
  accountBalances: Array<{
    id: string;
    accountName: string;
    accountType?: string;
    type?: string;
    currencyCode: string;
    currentBalance: number;
  }>;
  flowsByCurrency: Record<
    string,
    {
      inflows: number;
      outflows: number;
      net: number;
    }
  >;
  recentTransactions: Array<{
    id: string;
    date: Date;
    accountName: string;
    currencyCode: string;
    flowType: 'INFLOW' | 'OUTFLOW';
    paymentMethodName: string;
    reference: string | null;
    amount: number;
    notes: string | null;
  }>;
}

export interface SubscriptionsReportResult {
  summary: {
    totalActive: number;
    expiringIn7Days: number;
    expiringIn15Days: number;
    expired: number;
  };
  capacity: {
    totalMasterAccounts: number;
    totalProfiles: number;
    assignedProfiles: number;
    availableProfiles: number;
    occupancyPercent: number;
  };
  upcomingRenewals: Array<{
    id: string;
    customerName: string;
    serviceName: string;
    profileIdentifier: string | null;
    renewAt: Date;
    daysRemaining: number;
    amount: number;
    currencyCode: string;
    status: string;
  }>;
}
