import { Prisma, PaymentFlowType, PaymentStatus } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreatePaymentTransactionDTO,
  type PaymentTransactionQueryDTO,
  type PaymentTransactionWithDetails,
  type PaginatedPaymentTransactionsResult,
} from '#types/payment-transaction.types.js';

export class PaymentTransactionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'PaymentTransactionError';
    this.statusCode = statusCode;
  }
}

/**
 * Validar que el monto sea un número estrictamente positivo.
 */
const parseAmount = (val: number | string | Prisma.Decimal): Prisma.Decimal => {
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.lte(0)) {
      throw new PaymentTransactionError(
        'El monto de la transacción debe ser mayor a 0',
        400
      );
    }
    return dec;
  } catch (error: any) {
    if (error instanceof PaymentTransactionError) throw error;
    throw new PaymentTransactionError(
      'El monto ingresado no es un número válido',
      400
    );
  }
};

/**
 * Registrar y procesar una transacción de pago o cobro multimoneda.
 */
export const createPaymentTransaction = async (
  dto: CreatePaymentTransactionDTO,
  userId?: string | null
): Promise<PaymentTransactionWithDetails> => {
  const amount = parseAmount(dto.amount);

  if (!dto.financialAccountId) {
    throw new PaymentTransactionError(
      'Debe seleccionar la cuenta financiera o caja de destino/origen',
      400
    );
  }

  if (!dto.paymentMethodId) {
    throw new PaymentTransactionError(
      'Debe seleccionar el método de pago',
      400
    );
  }

  // 1. Validar cuenta financiera
  const account = await prisma.financialAccount.findUnique({
    where: { id: dto.financialAccountId },
    include: { currency: true },
  });

  if (!account || !account.isActive) {
    throw new PaymentTransactionError(
      'La cuenta financiera especificada no existe o está inactiva',
      404
    );
  }

  // 2. Validar método de pago
  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { id: dto.paymentMethodId },
  });

  if (!paymentMethod || !paymentMethod.isActive) {
    throw new PaymentTransactionError(
      'El método de pago especificado no existe o está inactivo',
      404
    );
  }

  const reference = dto.reference?.trim() || null;
  if (paymentMethod.requiresReference && !reference) {
    throw new PaymentTransactionError(
      `El método de pago "${paymentMethod.name}" requiere un número de referencia o comprobante bancario`,
      400
    );
  }

  // 3. Determinar moneda de la transacción
  const currencyId = dto.currencyId || account.currencyId;
  const currency = await prisma.currency.findUnique({
    where: { id: currencyId },
  });

  if (!currency || !currency.isActive) {
    throw new PaymentTransactionError(
      'La moneda especificada no existe o está inactiva',
      404
    );
  }

  // 4. Calcular contravalor en la moneda base contable del sistema
  const baseCurrency = await prisma.currency.findFirst({
    where: { isBase: true },
  });

  let baseCurrencyAmount = amount;
  let exchangeRateId = dto.exchangeRateId || null;

  if (baseCurrency && currency.id !== baseCurrency.id) {
    if (exchangeRateId) {
      const rateRecord = await prisma.exchangeRate.findUnique({
        where: { id: exchangeRateId },
      });
      if (rateRecord && rateRecord.isActive) {
        baseCurrencyAmount = amount.dividedBy(
          new Prisma.Decimal(rateRecord.rate)
        );
      }
    } else {
      // Buscar tasa activa directa o inversa
      const directRate = await prisma.exchangeRate.findFirst({
        where: {
          sourceCurrencyId: baseCurrency.id,
          targetCurrencyId: currency.id,
          isActive: true,
          effectiveTo: null,
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (directRate) {
        exchangeRateId = directRate.id;
        baseCurrencyAmount = amount.dividedBy(
          new Prisma.Decimal(directRate.rate)
        );
      } else {
        const inverseRate = await prisma.exchangeRate.findFirst({
          where: {
            sourceCurrencyId: currency.id,
            targetCurrencyId: baseCurrency.id,
            isActive: true,
            effectiveTo: null,
          },
          orderBy: { effectiveFrom: 'desc' },
        });

        if (inverseRate) {
          exchangeRateId = inverseRate.id;
          baseCurrencyAmount = amount.times(
            new Prisma.Decimal(inverseRate.rate)
          );
        }
      }
    }
  }

  const status: PaymentStatus = dto.status || 'VERIFIED';
  const flowType = dto.flowType;

  // 5. Validaciones asociadas a Compra (OUTFLOW)
  if (dto.purchaseId) {
    if (flowType !== 'OUTFLOW') {
      throw new PaymentTransactionError(
        'Los pagos a órdenes de compra deben registrarse como EGRESO (OUTFLOW)',
        400
      );
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: dto.purchaseId },
    });

    if (!purchase) {
      throw new PaymentTransactionError(
        'La orden de compra especificada no existe',
        404
      );
    }

    if (purchase.status === 'CANCELLED') {
      throw new PaymentTransactionError(
        'No se pueden registrar pagos a una orden de compra cancelada',
        400
      );
    }
  }

  // 6. Ejecutar registro atómico y actualización de saldos en transacción
  const transaction = await prisma.$transaction(async (tx) => {
    const createdTx = await tx.paymentTransaction.create({
      data: {
        flowType,
        status,
        purchaseId: dto.purchaseId || null,
        saleId: dto.saleId || null,
        financialAccountId: account.id,
        paymentMethodId: paymentMethod.id,
        currencyId: currency.id,
        exchangeRateId,
        userId: userId || null,
        amount,
        baseCurrencyAmount,
        reference,
        receiptUrl: dto.receiptUrl?.trim() || null,
        notes: dto.notes?.trim() || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
      include: {
        financialAccount: {
          select: { id: true, name: true, type: true, bankName: true },
        },
        paymentMethod: {
          select: { id: true, name: true, requiresReference: true },
        },
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        exchangeRate: {
          select: { id: true, rate: true, source: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        purchase: {
          select: { id: true, orderNumber: true, total: true, totalPaid: true },
        },
      },
    });

    // Si el pago entra VERIFICADO, ajustar saldo de la cuenta financiera
    if (status === 'VERIFIED') {
      const currentAccBalance = new Prisma.Decimal(account.currentBalance);
      let newAccBalance: Prisma.Decimal;

      if (flowType === 'INFLOW') {
        newAccBalance = currentAccBalance.plus(amount);
      } else {
        newAccBalance = currentAccBalance.minus(amount);
      }

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: newAccBalance },
      });

      // Si abona a una compra, actualizar total pagado y estatus de la orden
      if (dto.purchaseId) {
        const purchase = await tx.purchase.findUniqueOrThrow({
          where: { id: dto.purchaseId },
        });

        // Determinar monto en la moneda de la compra
        let paymentAmountInPurchaseCurrency = amount;
        if (purchase.currencyId !== currency.id) {
          // Si difieren, convertir usando la tasa aplicada
          paymentAmountInPurchaseCurrency = baseCurrencyAmount; // Conversión referencial base
        }

        const newTotalPaid = new Prisma.Decimal(purchase.totalPaid).plus(
          paymentAmountInPurchaseCurrency
        );
        const purchaseTotal = new Prisma.Decimal(purchase.total);

        let newPurchaseStatus = purchase.status;
        if (newTotalPaid.gte(purchaseTotal)) {
          newPurchaseStatus = 'PAID';
        } else if (newTotalPaid.gt(0)) {
          newPurchaseStatus = 'PARTIALLY_PAID';
        }

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            totalPaid: newTotalPaid,
            status: newPurchaseStatus,
          },
        });
      }
    }

    return createdTx;
  });

  return transaction as any;
};

/**
 * Listar transacciones de pago/cobro con filtros y paginación.
 */
export const getPaymentTransactions = async (
  query: PaymentTransactionQueryDTO
): Promise<PaginatedPaymentTransactionsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.flowType) where.flowType = query.flowType;
  if (query.status) where.status = query.status;
  if (query.purchaseId) where.purchaseId = query.purchaseId;
  if (query.saleId) where.saleId = query.saleId;
  if (query.financialAccountId)
    where.financialAccountId = query.financialAccountId;
  if (query.paymentMethodId) where.paymentMethodId = query.paymentMethodId;
  if (query.currencyId) where.currencyId = query.currencyId;

  if (query.fromDate || query.toDate) {
    where.paidAt = {};
    if (query.fromDate) where.paidAt.gte = new Date(query.fromDate);
    if (query.toDate) where.paidAt.lte = new Date(query.toDate);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { reference: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
      { financialAccount: { name: { contains: term, mode: 'insensitive' } } },
      { paymentMethod: { name: { contains: term, mode: 'insensitive' } } },
    ];
  }

  const allowedSortBy = ['paidAt', 'amount', 'createdAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'paidAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, transactions] = await Promise.all([
    prisma.paymentTransaction.count({ where }),
    prisma.paymentTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        financialAccount: {
          select: { id: true, name: true, type: true, bankName: true },
        },
        paymentMethod: {
          select: { id: true, name: true, requiresReference: true },
        },
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        exchangeRate: {
          select: { id: true, rate: true, source: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        purchase: {
          select: { id: true, orderNumber: true, total: true, totalPaid: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: transactions as any[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Obtener detalle de una transacción de pago por ID.
 */
export const getPaymentTransactionById = async (
  id: string
): Promise<PaymentTransactionWithDetails> => {
  if (!id) {
    throw new PaymentTransactionError(
      'El ID de la transacción es requerido',
      400
    );
  }

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id },
    include: {
      financialAccount: {
        select: { id: true, name: true, type: true, bankName: true },
      },
      paymentMethod: {
        select: { id: true, name: true, requiresReference: true },
      },
      currency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      exchangeRate: {
        select: { id: true, rate: true, source: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
      purchase: {
        select: { id: true, orderNumber: true, total: true, totalPaid: true },
      },
    },
  });

  if (!transaction) {
    throw new PaymentTransactionError('Transacción de pago no encontrada', 404);
  }

  return transaction as any;
};

/**
 * Anular o rechazar una transacción de pago y revertir saldos en la cuenta financiera y la compra/venta.
 */
export const voidPaymentTransaction = async (
  id: string,
  reason?: string
): Promise<PaymentTransactionWithDetails> => {
  if (!id) {
    throw new PaymentTransactionError(
      'El ID de la transacción es requerido',
      400
    );
  }

  const txRecord = await prisma.paymentTransaction.findUnique({
    where: { id },
  });

  if (!txRecord) {
    throw new PaymentTransactionError('Transacción de pago no encontrada', 404);
  }

  if (txRecord.status === 'REJECTED' || txRecord.status === 'REFUNDED') {
    throw new PaymentTransactionError(
      'Esta transacción ya se encuentra anulada o rechazada',
      400
    );
  }

  const wasVerified = txRecord.status === 'VERIFIED';
  const amount = new Prisma.Decimal(txRecord.amount);

  await prisma.$transaction(async (tx) => {
    // 1. Revertir saldo en la cuenta financiera si estaba verificada
    if (wasVerified) {
      const account = await tx.financialAccount.findUniqueOrThrow({
        where: { id: txRecord.financialAccountId },
      });

      const currentAccBalance = new Prisma.Decimal(account.currentBalance);
      let reversedBalance: Prisma.Decimal;

      if (txRecord.flowType === 'INFLOW') {
        // Se revierte ingreso restando
        reversedBalance = currentAccBalance.minus(amount);
      } else {
        // Se revierte egreso sumando
        reversedBalance = currentAccBalance.plus(amount);
      }

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: reversedBalance },
      });

      // 2. Si estaba vinculada a una compra, descontar del total pagado
      if (txRecord.purchaseId) {
        const purchase = await tx.purchase.findUniqueOrThrow({
          where: { id: txRecord.purchaseId },
        });

        const newTotalPaid = Prisma.Decimal.max(
          0,
          new Prisma.Decimal(purchase.totalPaid).minus(amount)
        );

        let newPurchaseStatus = purchase.status;
        if (newTotalPaid.lte(0)) {
          newPurchaseStatus = 'PENDING';
        } else if (newTotalPaid.lt(new Prisma.Decimal(purchase.total))) {
          newPurchaseStatus = 'PARTIALLY_PAID';
        }

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            totalPaid: newTotalPaid,
            status: newPurchaseStatus,
          },
        });
      }
    }

    // 3. Marcar transacción como rechazada/anulada
    const appendNote = reason
      ? ` | Anulado: ${reason.trim()}`
      : ' | Transacción anulada';
    await tx.paymentTransaction.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: (txRecord.notes || '') + appendNote,
      },
    });
  });

  return await getPaymentTransactionById(id);
};
