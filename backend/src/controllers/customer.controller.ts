import { type Response, type NextFunction } from 'express';
import {
  createCustomer as createCustomerService,
  getCustomers as getCustomersService,
  getCustomerById as getCustomerByIdService,
  updateCustomer as updateCustomerService,
  toggleCustomerStatus as toggleCustomerStatusService,
  deleteCustomer as deleteCustomerService,
  CustomerError,
} from '#services/customer.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar un nuevo cliente.
 * POST /api/customers
 */
export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      lastName,
      documentId,
      phone,
      email,
      address,
      notes,
      isActive,
    } = req.body;

    const customer = await createCustomerService({
      name,
      lastName,
      documentId,
      phone,
      email,
      address,
      notes,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: customer,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar clientes con filtros, búsqueda y paginación.
 * GET /api/customers
 */
export const getCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      phone,
      documentId,
      email,
      isActive,
      includeDeleted,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getCustomersService({
      search: search as string,
      phone: phone as string,
      documentId: documentId as string,
      email: email as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      includeDeleted:
        includeDeleted !== undefined ? includeDeleted === 'true' : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un cliente por ID.
 * GET /api/customers/:id
 */
export const getCustomerById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const customer = await getCustomerByIdService(id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar los datos de un cliente.
 * PUT/PATCH /api/customers/:id
 */
export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      lastName,
      documentId,
      phone,
      email,
      address,
      notes,
      isActive,
    } = req.body;

    const customer = await updateCustomerService(id, {
      name,
      lastName,
      documentId,
      phone,
      email,
      address,
      notes,
      isActive,
    });

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: customer,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar estado activo/inactivo de un cliente.
 * PATCH /api/customers/:id/status
 */
export const toggleCustomerStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const customer = await toggleCustomerStatusService(id);

    res.json({
      success: true,
      message: `Cliente ${customer.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: customer,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un cliente (lógico si tiene histórico, físico si no tiene dependencias).
 * DELETE /api/customers/:id
 */
export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { customer, isSoftDeleted } = await deleteCustomerService(id);

    res.json({
      success: true,
      message: isSoftDeleted
        ? 'Cliente desactivado y marcado como eliminado para preservar su historial'
        : 'Cliente eliminado exitosamente',
      data: customer,
    });
  } catch (error) {
    if (error instanceof CustomerError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
