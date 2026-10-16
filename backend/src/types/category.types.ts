export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  description?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  description?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

export interface CategoryQueryDTO {
  search?: string;
  isActive?: boolean;
  parentCategoryId?: string | null;
  isRoot?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'slug' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryWithDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentCategoryId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentCategory?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  subcategories?: CategoryWithDetails[];
  _count?: {
    products: number;
    subcategories: number;
  };
}

export interface PaginatedCategoriesResult {
  data: CategoryWithDetails[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
