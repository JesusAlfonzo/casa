export type StreamingAccountStatus =
  | "AVAILABLE"
  | "FULL"
  | "EXPIRED"
  | "DOWN_SUPPORT"
  | "SUSPENDED";

export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  serviceTypeId: string;
  basePrice: number | string;
  defaultDurationDays?: number | null;
  requiresStreamingAccount: boolean;
  isFullAccountSale: boolean;
  isActive: boolean;
  serviceType?: {
    id: string;
    name: string;
  };
}

export interface Supplier {
  id: string;
  legalName: string;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface StreamingProfile {
  id: string;
  streamingAccountId: string;
  slotNumber: number;
  profileName?: string | null;
  profilePin?: string | null;
  isOccupied: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptions?: Subscription[];
  streamingAccount?: {
    id: string;
    accessEmail: string;
    status: StreamingAccountStatus;
    supplierCutoffDate: string;
    service: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface StreamingAccount {
  id: string;
  serviceId: string;
  supplierId?: string | null;
  purchaseId?: string | null;
  accessEmail: string;
  accessPassword?: string;
  securityPin?: string | null;
  profileCapacity: number;
  occupiedProfiles: number;
  accountCost?: number | string | null;
  supplierStartDate: string;
  supplierCutoffDate: string;
  status: StreamingAccountStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  service: Service;
  supplier?: Supplier | null;
  profiles: StreamingProfile[];
  _count?: {
    subscriptions: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  lastName?: string | null;
  documentId?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Subscription {
  id: string;
  code: string;
  customerId: string;
  serviceId: string;
  streamingAccountId?: string | null;
  streamingProfileId?: string | null;
  agreedPrice: number | string;
  startDate: string;
  expirationDate: string;
  autoRenew: boolean;
  status: SubscriptionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  service: Service;
  streamingAccount?: StreamingAccount | null;
  streamingProfile?: StreamingProfile | null;
}

export interface StreamingStats {
  totalAccounts: number;
  availableAccounts: number;
  fullAccounts: number;
  expiredAccounts: number;
  downSupportAccounts: number;
  suspendedAccounts: number;
  totalCapacity: number;
  totalOccupiedProfiles: number;
  expiringSoonCount: number;
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
