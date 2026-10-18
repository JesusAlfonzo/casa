import { type Response, type NextFunction } from 'express';
import {
  createPaymentMethod as createPaymentMethodService,
  getPaymentMethods as getPaymentMethodsService,
  getPaymentMethodById as getPaymentMethodByIdService,
  updatePaymentMethod as updatePaymentMethodService,
  togglePaymentMethodStatus as togglePaymentMethodStatusService,
  deletePaymentMethod as deletePaymentMethodService,
  PaymentMethodError,
} from '#services/payment-method.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar un nuevo método de pago.
 * POST /api/payment-methods
 */
export const createPaymentMethod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, requiresReference, isActive } = req.body;

    const paymentMethod = await createPaymentMethodService({
      name,
      requiresReference,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Método de pago registrado exitosamente',
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar métodos de pago con filtros y paginación.
 * GET /api/payment-methods
 */
export const getPaymentMethods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      isActive,
      requiresReference,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getPaymentMethodsService({
      search: search as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      requiresReference:
        requiresReference !== undefined
          ? requiresReference === 'true' || requiresReference === '1'
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
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un método de pago por ID.
 * GET /api/payment-methods/:id
 */
export const getPaymentMethodById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const paymentMethod = await getPaymentMethodByIdService(id);

    res.status(200).json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar un método de pago.
 * PUT /api/payment-methods/:id o PATCH /api/payment-methods/:id
 */
export const updatePaymentMethod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, requiresReference, isActive } = req.body;

    const paymentMethod = await updatePaymentMethodService(id, {
      name,
      requiresReference,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Método de pago actualizado exitosamente',
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de un método de pago.
 * PATCH /api/payment-methods/:id/status
 */
export const togglePaymentMethodStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const paymentMethod = await togglePaymentMethodStatusService(id);

    res.status(200).json({
      success: true,
      message: `Método de pago ${paymentMethod.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: paymentMethod,
    });
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un método de pago.
 * DELETE /api/payment-methods/:id
 */
export const deletePaymentMethod = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deletePaymentMethodService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof PaymentMethodError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
