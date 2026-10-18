import { type Response, type NextFunction } from 'express';
import {
  createProduct as createProductService,
  getProducts as getProductsService,
  getProductById as getProductByIdService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  toggleProductStatus as toggleProductStatusService,
  ProductError,
} from '#services/product.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear un nuevo producto.
 * POST /api/products
 */
export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      sku,
      barcode,
      name,
      description,
      measurementUnitId,
      brandId,
      categoryId,
      averageCost,
      baseSalePrice,
      wholesalePrice,
      minStockAlert,
      imageUrl,
      isActive,
    } = req.body;

    const product = await createProductService({
      sku,
      barcode,
      name,
      description,
      measurementUnitId,
      brandId,
      categoryId,
      averageCost,
      baseSalePrice,
      wholesalePrice,
      minStockAlert,
      imageUrl,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar productos con filtros, búsqueda y paginación.
 * GET /api/products
 */
export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      categoryId,
      brandId,
      measurementUnitId,
      isActive,
      includeDeleted,
      minPrice,
      maxPrice,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getProductsService({
      search: search as string,
      categoryId: categoryId as string,
      brandId: brandId as string,
      measurementUnitId: measurementUnitId as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      includeDeleted:
        includeDeleted !== undefined
          ? includeDeleted === 'true' || includeDeleted === '1'
          : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
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
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un producto por ID.
 * GET /api/products/:id
 */
export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const product = await getProductByIdService(id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar un producto.
 * PUT /api/products/:id o PATCH /api/products/:id
 */
export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      sku,
      barcode,
      name,
      description,
      measurementUnitId,
      brandId,
      categoryId,
      averageCost,
      baseSalePrice,
      wholesalePrice,
      minStockAlert,
      imageUrl,
      isActive,
    } = req.body;

    const product = await updateProductService(id, {
      sku,
      barcode,
      name,
      description,
      measurementUnitId,
      brandId,
      categoryId,
      averageCost,
      baseSalePrice,
      wholesalePrice,
      minStockAlert,
      imageUrl,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un producto (soft-delete si tiene historial, hard-delete si está libre).
 * DELETE /api/products/:id
 */
export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteProductService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de un producto.
 * PATCH /api/products/:id/status
 */
export const toggleProductStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const product = await toggleProductStatusService(id);

    res.status(200).json({
      success: true,
      message: `Producto ${product.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: product,
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
