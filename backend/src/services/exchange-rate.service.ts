import { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateExchangeRateDTO,
  type UpdateExchangeRateDTO,
  type ExchangeRateQueryDTO,
  type ExchangeRateWithDetails,
  type PaginatedExchangeRatesResult,
} from '#types/exchange-rate.types.js';

export class ExchangeRateError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ExchangeRateError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador para la tasa de conversión.
 */
const parseRate = (val: number | string | Prisma.Decimal): Prisma.Decimal => {
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.lte(0)) {
      throw new ExchangeRateError(
        'La tasa de cambio debe ser un número positivo mayor a 0',
        400
      );
    }
    return dec;
  } catch (error: any) {
    if (error instanceof ExchangeRateError) throw error;
    throw new ExchangeRateError(
      'La tasa de cambio proporcionada no es un número válido',
      400
    );
  }
};

/**
 * Registrar una nueva tasa de cambio y cerrar automáticamente la vigencia de la tasa anterior.
 */
export const createExchangeRate = async (
  dto: CreateExchangeRateDTO
): Promise<ExchangeRateWithDetails> => {
  if (!dto.sourceCurrencyId || !dto.targetCurrencyId) {
    throw new ExchangeRateError(
      'Debe especificar la moneda de origen y la moneda de destino',
      400
    );
  }

  if (dto.sourceCurrencyId === dto.targetCurrencyId) {
    throw new ExchangeRateError(
      'La moneda de origen y de destino no pueden ser la misma',
      400
    );
  }

  const rate = parseRate(dto.rate);

  // 1. Validar existencia y estado de ambas monedas
  const [sourceCurr, targetCurr] = await Promise.all([
    prisma.currency.findUnique({ where: { id: dto.sourceCurrencyId } }),
    prisma.currency.findUnique({ where: { id: dto.targetCurrencyId } }),
  ]);

  if (!sourceCurr || !sourceCurr.isActive) {
    throw new ExchangeRateError(
      'La moneda de origen especificada no existe o está inactiva',
      404
    );
  }

  if (!targetCurr || !targetCurr.isActive) {
    throw new ExchangeRateError(
      'La moneda de destino especificada no existe o está inactiva',
      404
    );
  }

  const effectiveFrom = dto.effectiveFrom
    ? new Date(dto.effectiveFrom)
    : new Date();
  const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
  const isActive = dto.isActive ?? true;
  const sourceName = dto.source?.trim() || null;

  // 2. Transacción: si esta tasa entra como vigente (effectiveTo === null e isActive === true),
  // cerrar la vigencia de cualquier tasa previa del mismo par y fuente
  const exchangeRate = await prisma.$transaction(async (tx) => {
    if (isActive && !effectiveTo) {
      await tx.exchangeRate.updateMany({
        where: {
          sourceCurrencyId: dto.sourceCurrencyId,
          targetCurrencyId: dto.targetCurrencyId,
          source: sourceName,
          effectiveTo: null,
          isActive: true,
        },
        data: {
          effectiveTo: effectiveFrom,
          isActive: false,
        },
      });
    }

    return await tx.exchangeRate.create({
      data: {
        sourceCurrencyId: dto.sourceCurrencyId,
        targetCurrencyId: dto.targetCurrencyId,
        rate,
        source: sourceName,
        effectiveFrom,
        effectiveTo,
        isActive,
      },
      include: {
        sourceCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        targetCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        _count: {
          select: {
            purchases: true,
            sales: true,
            paymentTransactions: true,
          },
        },
      },
    });
  });

  return exchangeRate as any;
};

/**
 * Obtener la tasa de cambio vigente entre dos monedas (con soporte para tasa inversa).
 */
export const getCurrentRate = async (
  sourceCurrencyId: string,
  targetCurrencyId: string,
  source?: string
): Promise<{
  rate: Prisma.Decimal | number;
  isInverse: boolean;
  rateRecord: ExchangeRateWithDetails | null;
}> => {
  if (sourceCurrencyId === targetCurrencyId) {
    return {
      rate: 1,
      isInverse: false,
      rateRecord: null,
    };
  }

  const whereDirect: any = {
    sourceCurrencyId,
    targetCurrencyId,
    isActive: true,
    effectiveTo: null,
  };

  if (source) {
    whereDirect.source = { equals: source, mode: 'insensitive' };
  }

  // 1. Buscar tasa directa vigente
  const directRate = await prisma.exchangeRate.findFirst({
    where: whereDirect,
    orderBy: { effectiveFrom: 'desc' },
    include: {
      sourceCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      targetCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
    },
  });

  if (directRate) {
    return {
      rate: directRate.rate,
      isInverse: false,
      rateRecord: directRate as any,
    };
  }

  // 2. Si no hay tasa directa, buscar tasa inversa
  const whereInverse: any = {
    sourceCurrencyId: targetCurrencyId,
    targetCurrencyId: sourceCurrencyId,
    isActive: true,
    effectiveTo: null,
  };

  if (source) {
    whereInverse.source = { equals: source, mode: 'insensitive' };
  }

  const inverseRate = await prisma.exchangeRate.findFirst({
    where: whereInverse,
    orderBy: { effectiveFrom: 'desc' },
    include: {
      sourceCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      targetCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
    },
  });

  if (inverseRate) {
    const calculated = new Prisma.Decimal(1).dividedBy(
      new Prisma.Decimal(inverseRate.rate)
    );
    return {
      rate: calculated,
      isInverse: true,
      rateRecord: inverseRate as any,
    };
  }

  throw new ExchangeRateError(
    'No se encontró una tasa de cambio vigente activa entre las monedas seleccionadas',
    404
  );
};

/**
 * Listar historial de tasas de cambio con filtros y paginación.
 */
export const getExchangeRates = async (
  query: ExchangeRateQueryDTO
): Promise<PaginatedExchangeRatesResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.sourceCurrencyId) {
    where.sourceCurrencyId = query.sourceCurrencyId;
  }

  if (query.targetCurrencyId) {
    where.targetCurrencyId = query.targetCurrencyId;
  }

  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  if (query.onlyCurrent === true) {
    where.effectiveTo = null;
    where.isActive = true;
  }

  if (query.source && query.source.trim()) {
    where.source = { contains: query.source.trim(), mode: 'insensitive' };
  }

  if (query.fromDate || query.toDate) {
    where.effectiveFrom = {};
    if (query.fromDate) where.effectiveFrom.gte = new Date(query.fromDate);
    if (query.toDate) where.effectiveFrom.lte = new Date(query.toDate);
  }

  const allowedSortBy = ['effectiveFrom', 'rate', 'createdAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'effectiveFrom';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, rates] = await Promise.all([
    prisma.exchangeRate.count({ where }),
    prisma.exchangeRate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        sourceCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        targetCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
        _count: {
          select: {
            purchases: true,
            sales: true,
            paymentTransactions: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: rates as any[],
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
 * Obtener detalle de una tasa de cambio por ID.
 */
export const getExchangeRateById = async (
  id: string
): Promise<ExchangeRateWithDetails> => {
  if (!id) {
    throw new ExchangeRateError('El ID de la tasa de cambio es requerido', 400);
  }

  const rate = await prisma.exchangeRate.findUnique({
    where: { id },
    include: {
      sourceCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      targetCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      _count: {
        select: {
          purchases: true,
          sales: true,
          paymentTransactions: true,
        },
      },
    },
  });

  if (!rate) {
    throw new ExchangeRateError('Tasa de cambio no encontrada', 404);
  }

  return rate as any;
};

/**
 * Actualizar una tasa de cambio.
 */
export const updateExchangeRate = async (
  id: string,
  dto: UpdateExchangeRateDTO
): Promise<ExchangeRateWithDetails> => {
  if (!id) {
    throw new ExchangeRateError('El ID de la tasa de cambio es requerido', 400);
  }

  const existing = await prisma.exchangeRate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ExchangeRateError('Tasa de cambio no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.rate !== undefined) {
    updateData.rate = parseRate(dto.rate);
  }

  if (dto.source !== undefined) {
    updateData.source = dto.source ? dto.source.trim() : null;
  }

  if (dto.effectiveFrom !== undefined) {
    updateData.effectiveFrom = new Date(dto.effectiveFrom);
  }

  if (dto.effectiveTo !== undefined) {
    updateData.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.exchangeRate.update({
    where: { id },
    data: updateData,
    include: {
      sourceCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      targetCurrency: {
        select: { id: true, code: true, name: true, symbol: true },
      },
      _count: {
        select: {
          purchases: true,
          sales: true,
          paymentTransactions: true,
        },
      },
    },
  });

  return updated as any;
};

/**
 * Eliminar una tasa de cambio.
 * Bloquea la eliminación si ya fue utilizada en compras, ventas o transacciones financieras.
 */
export const deleteExchangeRate = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new ExchangeRateError('El ID de la tasa de cambio es requerido', 400);
  }

  const rate = await prisma.exchangeRate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchases: true,
          sales: true,
          paymentTransactions: true,
        },
      },
    },
  });

  if (!rate) {
    throw new ExchangeRateError('Tasa de cambio no encontrada', 404);
  }

  const isUsed =
    rate._count.purchases > 0 ||
    rate._count.sales > 0 ||
    rate._count.paymentTransactions > 0;

  if (isUsed) {
    throw new ExchangeRateError(
      'No se puede eliminar esta tasa de cambio porque ya está vinculada a transacciones históricas registradas. Puede desactivarla en su lugar.',
      400
    );
  }

  await prisma.exchangeRate.delete({
    where: { id },
  });

  return {
    success: true,
    message: 'Tasa de cambio eliminada exitosamente',
  };
};
