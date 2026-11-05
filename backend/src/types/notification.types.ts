export type NotificationType =
  | 'STREAMING_EXPIRATION'
  | 'STREAMING_CUTOFF'
  | 'STOCK_LOW'
  | 'STOCK_OUT'
  | 'PAYMENT_OVERDUE'
  | 'SYSTEM_ALERT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateNotificationDTO {
  userId?: string | null;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, any> | null;
}

export interface NotificationQueryDTO {
  userId?: string;
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

export interface NotificationItem {
  id: string;
  userId: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
}

export interface ScanAlertsResponse {
  scanTimestamp: Date | string;
  createdCount: number;
  details?: any;
  notifications?: NotificationItem[];
}

export type ScanAlertsResult = ScanAlertsResponse;
