import { type Response, type NextFunction } from 'express';
import {
  createBrand as createBrandService,
  getBrands as getBrandsService,
  getBrandById as getBrandByIdService,
  updateBrand as updateBrandService,
  deleteBrand as deleteBrandService,
  toggleBrandStatus as toggleBrandStatusService,
  BrandError,
} from '#services/brand.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear una nueva marca.
 * POST /api/v1/brands
 */
export const createBrand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, logoUrl, isActive } = req.body;

    const brand = await createBrandService({
      name,
      description,
      logoUrl,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Marca creada exitosamente',
      data: brand,
    });
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar marcas con paginación, filtros y búsqueda.
 * GET /api/v1/brands
 */
export const getBrands = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, page, limit, sortBy, sortOrder } = req.query;

    const result = await getBrandsService({
      search: search as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una marca por ID.
 * GET /api/v1/brands/:id
 */
export const getBrandById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const brand = await getBrandByIdService(id);

    res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una marca.
 * PUT /api/v1/brands/:id o PATCH /api/v1/brands/:id
 */
export const updateBrand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, description, logoUrl, isActive } = req.body;

    const brand = await updateBrandService(id, {
      name,
      description,
      logoUrl,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Marca actualizada exitosamente',
      data: brand,
    });
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una marca (si no posee productos asociados).
 * DELETE /api/v1/brands/:id
 */
export const deleteBrand = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteBrandService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo/inactivo de una marca.
 * PATCH /api/v1/brands/:id/status
 */
export const toggleBrandStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const brand = await toggleBrandStatusService(id);

    res.status(200).json({
      success: true,
      message: `Marca ${brand.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: brand,
    });
  } catch (error) {
    if (error instanceof BrandError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
