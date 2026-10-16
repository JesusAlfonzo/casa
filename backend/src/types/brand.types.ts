export interface CreateBrandDTO {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateBrandDTO {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
}

export interface BrandQueryDTO {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BrandWithCount {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    products: number;
  };
}

export interface PaginatedBrandsResult {
  data: BrandWithCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
