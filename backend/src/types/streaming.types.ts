import {
  Prisma,
  type StreamingAccount,
  type StreamingProfile,
  type StreamingAccountStatus,
  type Service,
  type Supplier,
  type Purchase,
} from '@prisma/client';

export interface InitialProfileSlotDTO {
  slotNumber?: number;
  profileName?: string | null;
  profilePin?: string | null;
  isOccupied?: boolean;
}

export interface CreateStreamingAccountDTO {
  serviceId: string;
  supplierId?: string | null;
  purchaseId?: string | null;
  accessEmail: string;
  accessPassword: string;
  securityPin?: string | null;
  profileCapacity?: number;
  accountCost?: number | string | Prisma.Decimal | null;
  supplierStartDate?: Date | string;
  supplierCutoffDate: Date | string;
  status?: StreamingAccountStatus;
  notes?: string | null;
  profiles?: InitialProfileSlotDTO[];
}

export interface UpdateStreamingAccountDTO {
  serviceId?: string;
  supplierId?: string | null;
  purchaseId?: string | null;
  accessEmail?: string;
  accessPassword?: string;
  securityPin?: string | null;
  profileCapacity?: number;
  accountCost?: number | string | Prisma.Decimal | null;
  supplierStartDate?: Date | string;
  supplierCutoffDate?: Date | string;
  status?: StreamingAccountStatus;
  notes?: string | null;
}

export interface StreamingAccountQueryDTO {
  search?: string;
  serviceId?: string;
  supplierId?: string;
  purchaseId?: string;
  status?: StreamingAccountStatus;
  expiringBefore?: Date | string;
  expiringWithinDays?: number;
  hasAvailableProfiles?: boolean;
  page?: number;
  limit?: number;
  sortBy?:
    | 'supplierCutoffDate'
    | 'createdAt'
    | 'accessEmail'
    | 'profileCapacity'
    | 'occupiedProfiles';
  sortOrder?: 'asc' | 'desc';
}

export interface StreamingProfileWithDetails extends StreamingProfile {
  streamingAccount?: {
    id: string;
    accessEmail: string;
    status: StreamingAccountStatus;
    supplierCutoffDate: Date;
    service: {
      id: string;
      code: string;
      name: string;
    };
  };
  _count?: {
    subscriptions: number;
  };
}

export interface UpdateStreamingProfileDTO {
  profileName?: string | null;
  profilePin?: string | null;
  isOccupied?: boolean;
}

export interface StreamingAccountWithDetails extends StreamingAccount {
  service: Service;
  supplier: Supplier | null;
  purchase?: Purchase | null;
  profiles: StreamingProfile[];
  _count?: {
    subscriptions: number;
  };
}

export interface PaginatedStreamingAccountsResult {
  items: StreamingAccountWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StreamingAccountStats {
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
