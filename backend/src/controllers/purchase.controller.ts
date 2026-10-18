import { type Response, type NextFunction } from 'express';
import {
  createPurchase as createPurchaseService,
  getPurchases as getPurchasesService,
  getPurchaseById as getPurchaseByIdService,
  receivePurchaseItems as receivePurchaseItemsService,
  updatePurchase as updatePurchaseService,
  cancelPurchase as cancelPurchaseService,
  PurchaseError,
} from '#services/purchase.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva orden de compra.
 * POST /api/purchases
 */
export const createPurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      orderNumber,
      supplierInvoiceNumber,
      supplierId,
      currencyId,
      exchangeRateId,
      exchangeRateValue,
      status,
      purchasedAt,
      dueDate,
      notes,
      receiveOnCreate,
      items,
    } = req.body;

    const userId = req.user?.id;

    const purchase = await createPurchaseService(
      {
        orderNumber,
        supplierInvoiceNumber,
        supplierId,
        currencyId,
        exchangeRateId,
        exchangeRateValue,
        status,
        purchasedAt,
        dueDate,
        notes,
        receiveOnCreate,
        items,
      },
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Orden de compra registrada exitosamente',
      data: purchase,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar órdenes de compra con filtros y paginación.
 * GET /api/purchases
 */
export const getPurchases = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      supplierId,
      status,
      currencyId,
      search,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getPurchasesService({
      supplierId: supplierId as string,
      status: status as any,
      currencyId: currencyId as string,
      search: search as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
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
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle completo de una orden de compra por ID.
 * GET /api/purchases/:id
 */
export const getPurchaseById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const purchase = await getPurchaseByIdService(id);

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Recibir mercancía física en almacén e ingresar al inventario.
 * POST /api/purchases/:id/receive
 */
export const receivePurchaseItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { items } = req.body;
    const userId = req.user?.id;

    const purchase = await receivePurchaseItemsService(id, { items }, userId);

    res.status(200).json({
      success: true,
      message:
        'Recepción de mercancía procesada e ingresada al inventario exitosamente',
      data: purchase,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar datos de la compra (factura, vencimiento, notas).
 * PATCH /api/purchases/:id
 */
export const updatePurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { supplierInvoiceNumber, dueDate, notes, status } = req.body;

    const updated = await updatePurchaseService(id, {
      supplierInvoiceNumber,
      dueDate,
      notes,
      status,
    });

    res.status(200).json({
      success: true,
      message: 'Orden de compra actualizada exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Cancelar una orden de compra.
 * POST /api/purchases/:id/cancel
 */
export const cancelPurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await cancelPurchaseService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof PurchaseError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
