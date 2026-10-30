import { type Response, type NextFunction } from 'express';
import {
  createSale as createSaleService,
  getSales as getSalesService,
  getSaleById as getSaleByIdService,
  addSalePayment as addSalePaymentService,
  voidSale as voidSaleService,
  getSaleStats as getSaleStatsService,
  SaleError,
} from '#services/sale.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva venta (productos, servicios o suscripciones).
 * POST /api/sales
 */
export const createSale = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      documentNumber,
      outputType,
      status,
      customerId,
      currencyId,
      exchangeRateId,
      exchangeRateValue,
      discountAmount,
      soldAt,
      notes,
      items,
      payments,
    } = req.body;

    const sale = await createSaleService(
      {
        documentNumber,
        outputType,
        status,
        customerId,
        currencyId,
        exchangeRateId,
        exchangeRateValue,
        discountAmount,
        soldAt,
        notes,
        items,
        payments,
      },
      req.user?.id
    );

    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: sale,
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar ventas con filtros avanzados y paginación.
 * GET /api/sales
 */
export const getSales = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      documentNumber,
      customerId,
      userId,
      currencyId,
      outputType,
      status,
      itemType,
      productId,
      serviceId,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getSalesService({
      search: search as string,
      documentNumber: documentNumber as string,
      customerId: customerId as string,
      userId: userId as string,
      currencyId: currencyId as string,
      outputType: outputType as any,
      status: status as any,
      itemType: itemType as any,
      productId: productId as string,
      serviceId: serviceId as string,
      startDate: startDate as string,
      endDate: endDate as string,
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
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener estadísticas globales y métricas de ventas.
 * GET /api/sales/stats
 */
export const getSaleStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getSaleStatsService();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una venta por ID.
 * GET /api/sales/:id
 */
export const getSaleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const sale = await getSaleByIdService(id);

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Registrar un nuevo cobro o abono a una venta.
 * POST /api/sales/:id/payments
 */
export const addSalePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      financialAccountId,
      paymentMethodId,
      amount,
      currencyId,
      exchangeRateId,
      reference,
      receiptUrl,
      notes,
      paidAt,
    } = req.body;

    const sale = await addSalePaymentService(
      id,
      {
        financialAccountId,
        paymentMethodId,
        amount,
        currencyId,
        exchangeRateId,
        reference,
        receiptUrl,
        notes,
        paidAt,
      },
      req.user?.id
    );

    res.json({
      success: true,
      message: 'Cobro registrado exitosamente',
      data: sale,
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Anular una venta, reintegrando inventario físico y reversando cobros.
 * POST /api/sales/:id/void
 */
export const voidSale = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const sale = await voidSaleService(id, reason, req.user?.id);

    res.json({
      success: true,
      message: 'Venta anulada exitosamente y stock reintegrado',
      data: sale,
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
