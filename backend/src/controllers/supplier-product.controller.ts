import { type Response, type NextFunction } from 'express';
import {
  assignSupplierProduct as assignSupplierProductService,
  getSupplierProducts as getSupplierProductsService,
  getSupplierProductById as getSupplierProductByIdService,
  updateSupplierProduct as updateSupplierProductService,
  setPrimarySupplier as setPrimarySupplierService,
  removeSupplierProduct as removeSupplierProductService,
  SupplierProductError,
} from '#services/supplier-product.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Asociar un producto a un proveedor.
 * POST /api/supplier-products
 */
export const assignSupplierProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { supplierId, productId, supplierSku, lastCost, isPrimarySupplier } =
      req.body;

    const relation = await assignSupplierProductService({
      supplierId,
      productId,
      supplierSku,
      lastCost,
      isPrimarySupplier,
    });

    res.status(201).json({
      success: true,
      message: 'Producto vinculado al proveedor exitosamente',
      data: relation,
    });
  } catch (error) {
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar vínculos proveedor-producto con paginación, filtros y búsqueda.
 * GET /api/supplier-products
 */
export const getSupplierProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      supplierId,
      productId,
      isPrimarySupplier,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getSupplierProductsService({
      supplierId: supplierId as string,
      productId: productId as string,
      isPrimarySupplier:
        isPrimarySupplier !== undefined
          ? isPrimarySupplier === 'true' || isPrimarySupplier === '1'
          : undefined,
      search: search as string,
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
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un vínculo proveedor-producto por ID.
 * GET /api/supplier-products/:id
 */
export const getSupplierProductById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const relation = await getSupplierProductByIdService(id);

    res.status(200).json({
      success: true,
      data: relation,
    });
  } catch (error) {
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar datos de un vínculo proveedor-producto.
 * PUT /api/supplier-products/:id o PATCH /api/supplier-products/:id
 */
export const updateSupplierProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { supplierSku, lastCost, isPrimarySupplier } = req.body;

    const updated = await updateSupplierProductService(id, {
      supplierSku,
      lastCost,
      isPrimarySupplier,
    });

    res.status(200).json({
      success: true,
      message: 'Vínculo proveedor-producto actualizado exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Establecer este proveedor como el primario para el producto.
 * PATCH /api/supplier-products/:id/primary
 */
export const setPrimarySupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const updated = await setPrimarySupplierService(id);

    res.status(200).json({
      success: true,
      message: 'Proveedor configurado como principal exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Desvincular un producto de un proveedor.
 * DELETE /api/supplier-products/:id
 */
export const removeSupplierProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await removeSupplierProductService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SupplierProductError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
