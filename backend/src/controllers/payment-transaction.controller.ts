import { type Response, type NextFunction } from 'express';
import {
  createPaymentTransaction as createPaymentTransactionService,
  getPaymentTransactions as getPaymentTransactionsService,
  getPaymentTransactionById as getPaymentTransactionByIdService,
  voidPaymentTransaction as voidPaymentTransactionService,
  PaymentTransactionError,
} from '#services/payment-transaction.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar y procesar un pago o cobro.
 * POST /api/payment-transactions
 */
export const createPaymentTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      flowType,
      status,
      purchaseId,
      saleId,
      financialAccountId,
      paymentMethodId,
      currencyId,
      exchangeRateId,
      amount,
      reference,
      receiptUrl,
      notes,
      paidAt,
    } = req.body;

    const userId = req.user?.id;

    const transaction = await createPaymentTransactionService(
      {
        flowType,
        status,
        purchaseId,
        saleId,
        financialAccountId,
        paymentMethodId,
        currencyId,
        exchangeRateId,
        amount,
        reference,
        receiptUrl,
        notes,
        paidAt,
      },
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Transacción de pago registrada y liquidada exitosamente',
      data: transaction,
    });
  } catch (error) {
    if (error instanceof PaymentTransactionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar transacciones de pago con filtros y paginación.
 * GET /api/payment-transactions
 */
export const getPaymentTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      flowType,
      status,
      purchaseId,
      saleId,
      financialAccountId,
      paymentMethodId,
      currencyId,
      search,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getPaymentTransactionsService({
      flowType: flowType as any,
      status: status as any,
      purchaseId: purchaseId as string,
      saleId: saleId as string,
      financialAccountId: financialAccountId as string,
      paymentMethodId: paymentMethodId as string,
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
    if (error instanceof PaymentTransactionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una transacción de pago por ID.
 * GET /api/payment-transactions/:id
 */
export const getPaymentTransactionById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const transaction = await getPaymentTransactionByIdService(id);

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    if (error instanceof PaymentTransactionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Anular una transacción de pago y revertir saldos de cuenta y compra/venta.
 * POST /api/payment-transactions/:id/void
 */
export const voidPaymentTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const result = await voidPaymentTransactionService(id, reason);

    res.status(200).json({
      success: true,
      message: 'Transacción de pago anulada y saldos revertidos exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof PaymentTransactionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
