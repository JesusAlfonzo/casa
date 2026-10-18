export interface CreateMeasurementUnitDTO {
  name: string;
  abbreviation: string;
  allowsDecimals?: boolean;
  isActive?: boolean;
}

export interface UpdateMeasurementUnitDTO {
  name?: string;
  abbreviation?: string;
  allowsDecimals?: boolean;
  isActive?: boolean;
}

export interface MeasurementUnitQueryDTO {
  search?: string;
  isActive?: boolean;
  allowsDecimals?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'abbreviation' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface MeasurementUnitWithCount {
  id: string;
  name: string;
  abbreviation: string;
  allowsDecimals: boolean;
  isActive: boolean;
  createdAt: Date;
  _count?: {
    products: number;
  };
}

export interface PaginatedMeasurementUnitsResult {
  data: MeasurementUnitWithCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
