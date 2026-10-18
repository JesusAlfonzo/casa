import { prisma } from '#config/prisma.js';
import {
  type CreateCurrencyDTO,
  type UpdateCurrencyDTO,
  type CurrencyQueryDTO,
  type CurrencyWithCount,
  type PaginatedCurrenciesResult,
} from '#types/currency.types.js';

export class CurrencyError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'CurrencyError';
    this.statusCode = statusCode;
  }
}

/**
 * Crear una nueva moneda en el sistema contable y de facturación.
 */
export const createCurrency = async (
  dto: CreateCurrencyDTO
): Promise<CurrencyWithCount> => {
  const code = dto.code?.trim().toUpperCase();
  if (!code || code.length < 2 || code.length > 10) {
    throw new CurrencyError(
      'El código de la moneda es obligatorio y debe tener entre 2 y 10 caracteres (ej. USD, VES, EUR)',
      400
    );
  }

  const name = dto.name?.trim();
  if (!name) {
    throw new CurrencyError('El nombre de la moneda es obligatorio', 400);
  }

  const symbol = dto.symbol?.trim();
  if (!symbol) {
    throw new CurrencyError(
      'El símbolo monetario es obligatorio (ej. $, Bs., €)',
      400
    );
  }

  const decimals = dto.decimals !== undefined ? Number(dto.decimals) : 2;
  if (isNaN(decimals) || decimals < 0 || decimals > 6) {
    throw new CurrencyError(
      'El número de decimales debe ser un entero entre 0 y 6',
      400
    );
  }

  // Verificar si ya existe una moneda con el mismo código ISO/símbolo
  const existingCode = await prisma.currency.findUnique({
    where: { code },
  });

  if (existingCode) {
    throw new CurrencyError(
      `Ya existe una moneda registrada con el código "${code}"`,
      409
    );
  }

  // Verificar si es la primera moneda registrada en el sistema; de serlo, se asigna como moneda base automáticamente
  const totalCurrencies = await prisma.currency.count();
  const shouldBeBase =
    dto.isBase !== undefined ? Boolean(dto.isBase) : totalCurrencies === 0;

  const currency = await prisma.$transaction(async (tx) => {
    // Si se declara como moneda base, retirar la condición a cualquier otra moneda previa
    if (shouldBeBase) {
      await tx.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });
    }

    return await tx.currency.create({
      data: {
        code,
        name,
        symbol,
        isBase: shouldBeBase,
        decimals,
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            financialAccounts: true,
            purchases: true,
            sales: true,
            sourceExchangeRates: true,
            targetExchangeRates: true,
          },
        },
      },
    });
  });

  return currency;
};

/**
 * Listar monedas con filtros de búsqueda, estado, moneda base y paginación.
 */
export const getCurrencies = async (
  query: CurrencyQueryDTO
): Promise<PaginatedCurrenciesResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  if (query.isBase !== undefined) {
    where.isBase = Boolean(query.isBase);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { code: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
      { symbol: { contains: term, mode: 'insensitive' } },
    ];
  }

  const allowedSortBy = ['code', 'name', 'isBase', 'createdAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'code';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, currencies] = await Promise.all([
    prisma.currency.count({ where }),
    prisma.currency.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            financialAccounts: true,
            purchases: true,
            sales: true,
            sourceExchangeRates: true,
            targetExchangeRates: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: currencies,
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
 * Obtener la moneda base principal del sistema.
 */
export const getBaseCurrency = async (): Promise<CurrencyWithCount | null> => {
  const currency = await prisma.currency.findFirst({
    where: { isBase: true },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          purchases: true,
          sales: true,
          sourceExchangeRates: true,
          targetExchangeRates: true,
        },
      },
    },
  });

  return currency;
};

/**
 * Obtener detalle de una moneda por ID.
 */
export const getCurrencyById = async (
  id: string
): Promise<CurrencyWithCount> => {
  if (!id) {
    throw new CurrencyError('El ID de la moneda es requerido', 400);
  }

  const currency = await prisma.currency.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          purchases: true,
          sales: true,
          sourceExchangeRates: true,
          targetExchangeRates: true,
        },
      },
    },
  });

  if (!currency) {
    throw new CurrencyError('Moneda no encontrada', 404);
  }

  return currency;
};

/**
 * Actualizar una moneda existente.
 */
export const updateCurrency = async (
  id: string,
  dto: UpdateCurrencyDTO
): Promise<CurrencyWithCount> => {
  if (!id) {
    throw new CurrencyError('El ID de la moneda es requerido', 400);
  }

  const existing = await prisma.currency.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new CurrencyError('Moneda no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.code !== undefined) {
    const trimmedCode = dto.code.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 2) {
      throw new CurrencyError(
        'El código de la moneda no puede estar vacío',
        400
      );
    }

    const duplicateCode = await prisma.currency.findFirst({
      where: {
        code: trimmedCode,
        NOT: { id },
      },
    });

    if (duplicateCode) {
      throw new CurrencyError(
        `Ya existe otra moneda con el código "${trimmedCode}"`,
        409
      );
    }

    updateData.code = trimmedCode;
  }

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new CurrencyError(
        'El nombre de la moneda no puede estar vacío',
        400
      );
    }
    updateData.name = trimmedName;
  }

  if (dto.symbol !== undefined) {
    const trimmedSymbol = dto.symbol.trim();
    if (!trimmedSymbol) {
      throw new CurrencyError(
        'El símbolo de la moneda no puede estar vacío',
        400
      );
    }
    updateData.symbol = trimmedSymbol;
  }

  if (dto.decimals !== undefined) {
    const dec = Number(dto.decimals);
    if (isNaN(dec) || dec < 0 || dec > 6) {
      throw new CurrencyError(
        'El número de decimales debe estar entre 0 y 6',
        400
      );
    }
    updateData.decimals = dec;
  }

  // Manejo de condición de moneda base
  if (dto.isBase !== undefined) {
    const makeBase = Boolean(dto.isBase);
    if (!makeBase && existing.isBase) {
      throw new CurrencyError(
        'No puede desmarcar la moneda base directamente. Asigne otra moneda como base para reemplazarla.',
        400
      );
    }
    updateData.isBase = makeBase;
  }

  if (dto.isActive !== undefined) {
    const active = Boolean(dto.isActive);
    if (!active && existing.isBase) {
      throw new CurrencyError(
        'No se puede desactivar la moneda base principal del sistema',
        400
      );
    }
    updateData.isActive = active;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (updateData.isBase === true) {
      await tx.currency.updateMany({
        where: {
          isBase: true,
          NOT: { id },
        },
        data: { isBase: false },
      });
    }

    return await tx.currency.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            financialAccounts: true,
            purchases: true,
            sales: true,
            sourceExchangeRates: true,
            targetExchangeRates: true,
          },
        },
      },
    });
  });

  return updated;
};

/**
 * Designar una moneda como la moneda base del sistema contable.
 */
export const setBaseCurrency = async (
  id: string
): Promise<CurrencyWithCount> => {
  return await updateCurrency(id, { isBase: true, isActive: true });
};

/**
 * Eliminar una moneda.
 * Protege contra eliminación de la moneda base o de monedas con historial transaccional.
 */
export const deleteCurrency = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new CurrencyError('El ID de la moneda es requerido', 400);
  }

  const currency = await prisma.currency.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          purchases: true,
          sales: true,
          paymentTransactions: true,
          sourceExchangeRates: true,
          targetExchangeRates: true,
        },
      },
    },
  });

  if (!currency) {
    throw new CurrencyError('Moneda no encontrada', 404);
  }

  if (currency.isBase) {
    throw new CurrencyError(
      'No se puede eliminar la moneda base principal del sistema',
      400
    );
  }

  const hasTransactions =
    currency._count.purchases > 0 ||
    currency._count.sales > 0 ||
    currency._count.financialAccounts > 0 ||
    currency._count.paymentTransactions > 0;

  if (hasTransactions) {
    throw new CurrencyError(
      `No se puede eliminar la moneda "${currency.code}" porque tiene movimientos financieros, cuentas o facturación asociada. Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.currency.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Moneda "${currency.code}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de una moneda.
 */
export const toggleCurrencyStatus = async (
  id: string
): Promise<CurrencyWithCount> => {
  if (!id) {
    throw new CurrencyError('El ID de la moneda es requerido', 400);
  }

  const currency = await prisma.currency.findUnique({
    where: { id },
  });

  if (!currency) {
    throw new CurrencyError('Moneda no encontrada', 404);
  }

  if (currency.isBase && currency.isActive) {
    throw new CurrencyError(
      'No se puede desactivar la moneda base principal del sistema',
      400
    );
  }

  const updated = await prisma.currency.update({
    where: { id },
    data: {
      isActive: !currency.isActive,
    },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          purchases: true,
          sales: true,
          sourceExchangeRates: true,
          targetExchangeRates: true,
        },
      },
    },
  });

  return updated;
};
