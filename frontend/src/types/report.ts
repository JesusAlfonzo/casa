export interface SalesReportItem {
  id: string;
  documentNumber: string;
  orderNumber: string;
  soldAt: string;
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
  success: boolean;
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
  success: boolean;
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
  success: boolean;
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
    date: string;
    accountName: string;
    currencyCode: string;
    flowType: "INFLOW" | "OUTFLOW";
    paymentMethodName: string;
    reference: string | null;
    amount: number;
    notes: string | null;
  }>;
}

export interface SubscriptionsReportResult {
  success: boolean;
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
    renewAt: string;
    daysRemaining: number;
    amount: number;
    currencyCode: string;
    status: string;
  }>;
}
