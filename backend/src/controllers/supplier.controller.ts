import { type Response, type NextFunction } from 'express';
import {
  createSupplier as createSupplierService,
  getSuppliers as getSuppliersService,
  getSupplierById as getSupplierByIdService,
  updateSupplier as updateSupplierService,
  deleteSupplier as deleteSupplierService,
  toggleSupplierStatus as toggleSupplierStatusService,
  SupplierError,
} from '#services/supplier.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear un nuevo proveedor.
 * POST /api/suppliers
 */
export const createSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      legalName,
      tradeName,
      taxId,
      contactName,
      phone,
      email,
      address,
      notes,
      isActive,
    } = req.body;

    const supplier = await createSupplierService({
      legalName,
      tradeName,
      taxId,
      contactName,
      phone,
      email,
      address,
      notes,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: supplier,
    });
  } catch (error) {
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar proveedores con paginación, filtros y búsqueda.
 * GET /api/suppliers
 */
export const getSuppliers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, includeDeleted, page, limit, sortBy, sortOrder } =
      req.query;

    const result = await getSuppliersService({
      search: search as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      includeDeleted:
        includeDeleted !== undefined
          ? includeDeleted === 'true' || includeDeleted === '1'
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
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un proveedor por ID.
 * GET /api/suppliers/:id
 */
export const getSupplierById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const supplier = await getSupplierByIdService(id);

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar un proveedor.
 * PUT /api/suppliers/:id o PATCH /api/suppliers/:id
 */
export const updateSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      legalName,
      tradeName,
      taxId,
      contactName,
      phone,
      email,
      address,
      notes,
      isActive,
    } = req.body;

    const supplier = await updateSupplierService(id, {
      legalName,
      tradeName,
      taxId,
      contactName,
      phone,
      email,
      address,
      notes,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: supplier,
    });
  } catch (error) {
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un proveedor (soft-delete si tiene historial, hard-delete si está libre).
 * DELETE /api/suppliers/:id
 */
export const deleteSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteSupplierService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo/inactivo de un proveedor.
 * PATCH /api/suppliers/:id/status
 */
export const toggleSupplierStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const supplier = await toggleSupplierStatusService(id);

    res.status(200).json({
      success: true,
      message: `Proveedor ${supplier.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: supplier,
    });
  } catch (error) {
    if (error instanceof SupplierError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
