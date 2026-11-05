export type NotificationType =
  | 'STREAMING_EXPIRATION'
  | 'STREAMING_CUTOFF'
  | 'STOCK_LOW'
  | 'STOCK_OUT'
  | 'PAYMENT_OVERDUE'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NotificationItem {
  id: string;
  userId: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string | null;
  metadata: {
    subscriptionId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string | null;
    serviceName?: string;
    expirationDate?: string;
    whatsappUrl?: string | null;
    streamingAccountId?: string;
    accessEmail?: string;
    supplierCutoffDate?: string;
    productId?: string;
    productName?: string;
    sku?: string;
    currentStock?: number;
    minStockAlert?: number;
    saleId?: string;
    documentNumber?: string;
    pendingBalance?: number;
    currencyCode?: string;
    [key: string]: unknown;
  } | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  items: NotificationItem[];
  unreadCount: number;
  total: number;
}

export interface ScanAlertsResponse {
  success: boolean;
  scanTimestamp: string;
  createdCount: number;
  details: {
    expiringSubscriptions: number;
    upcomingCutoffs: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    overduePayments: number;
  };
}
