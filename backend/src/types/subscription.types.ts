import {
  Prisma,
  type Subscription,
  type SubscriptionStatus,
  type Customer,
  type Service,
  type StreamingAccount,
  type StreamingProfile,
} from '@prisma/client';

export interface CreateSubscriptionDTO {
  code?: string;
  customerId: string;
  serviceId: string;
  streamingAccountId?: string | null;
  streamingProfileId?: string | null;
  agreedPrice?: number | string | Prisma.Decimal;
  startDate?: Date | string;
  expirationDate?: Date | string;
  durationDays?: number;
  autoRenew?: boolean;
  status?: SubscriptionStatus;
  notes?: string | null;
}

export interface UpdateSubscriptionDTO {
  customerId?: string;
  serviceId?: string;
  streamingAccountId?: string | null;
  streamingProfileId?: string | null;
  agreedPrice?: number | string | Prisma.Decimal;
  startDate?: Date | string;
  expirationDate?: Date | string;
  autoRenew?: boolean;
  status?: SubscriptionStatus;
  notes?: string | null;
}

export interface RenewSubscriptionDTO {
  days?: number;
  newExpirationDate?: Date | string;
  agreedPrice?: number | string | Prisma.Decimal;
  notes?: string | null;
}

export interface SubscriptionQueryDTO {
  search?: string;
  customerId?: string;
  serviceId?: string;
  streamingAccountId?: string;
  streamingProfileId?: string;
  status?: SubscriptionStatus;
  expiringBefore?: Date | string;
  expiringWithinDays?: number;
  autoRenew?: boolean;
  page?: number;
  limit?: number;
  sortBy?:
    'expirationDate' | 'startDate' | 'createdAt' | 'agreedPrice' | 'code';
  sortOrder?: 'asc' | 'desc';
}

export interface SubscriptionWithDetails extends Subscription {
  customer: Customer;
  service: Service;
  streamingAccount: StreamingAccount | null;
  streamingProfile: StreamingProfile | null;
  _count?: {
    saleItems: number;
  };
}

export interface PaginatedSubscriptionsResult {
  items: SubscriptionWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSoonSubscriptions: number;
  expiredSubscriptions: number;
  suspendedSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRecurringRevenue: number;
}
