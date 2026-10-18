export interface CreateLocationDTO {
  code?: string;
  name: string;
  description?: string | null;
  address?: string | null;
  parentLocationId?: string | null;
  isActive?: boolean;
}

export interface UpdateLocationDTO {
  code?: string;
  name?: string;
  description?: string | null;
  address?: string | null;
  parentLocationId?: string | null;
  isActive?: boolean;
}

export interface LocationQueryDTO {
  search?: string;
  parentLocationId?: string | null;
  isRoot?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'code' | 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface LocationWithDetails {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  parentLocationId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentLocation?: {
    id: string;
    code: string;
    name: string;
  } | null;
  sublocations?: LocationWithDetails[];
  _count?: {
    sublocations: number;
    inventories: number;
    purchaseItems: number;
  };
}

export interface PaginatedLocationsResult {
  data: LocationWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
