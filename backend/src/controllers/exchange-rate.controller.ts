import { type Response, type NextFunction } from 'express';
import {
  createExchangeRate as createExchangeRateService,
  getCurrentRate as getCurrentRateService,
  getExchangeRates as getExchangeRatesService,
  getExchangeRateById as getExchangeRateByIdService,
  updateExchangeRate as updateExchangeRateService,
  deleteExchangeRate as deleteExchangeRateService,
  ExchangeRateError,
} from '#services/exchange-rate.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva tasa de cambio.
 * POST /api/exchange-rates
 */
export const createExchangeRate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      sourceCurrencyId,
      targetCurrencyId,
      rate,
      source,
      effectiveFrom,
      effectiveTo,
      isActive,
    } = req.body;

    const exchangeRate = await createExchangeRateService({
      sourceCurrencyId,
      targetCurrencyId,
      rate,
      source,
      effectiveFrom,
      effectiveTo,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Tasa de cambio registrada exitosamente',
      data: exchangeRate,
    });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener la tasa de cambio vigente entre dos monedas.
 * GET /api/exchange-rates/current?sourceCurrencyId=...&targetCurrencyId=...&source=...
 */
export const getCurrentRate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sourceCurrencyId, targetCurrencyId, source } = req.query;

    if (!sourceCurrencyId || !targetCurrencyId) {
      return res.status(400).json({
        error:
          'Debe proporcionar "sourceCurrencyId" y "targetCurrencyId" en la consulta',
      });
    }

    const result = await getCurrentRateService(
      sourceCurrencyId as string,
      targetCurrencyId as string,
      source as string
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar tasas de cambio históricas y vigentes.
 * GET /api/exchange-rates
 */
export const getExchangeRates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      sourceCurrencyId,
      targetCurrencyId,
      source,
      isActive,
      onlyCurrent,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getExchangeRatesService({
      sourceCurrencyId: sourceCurrencyId as string,
      targetCurrencyId: targetCurrencyId as string,
      source: source as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      onlyCurrent:
        onlyCurrent !== undefined
          ? onlyCurrent === 'true' || onlyCurrent === '1'
          : undefined,
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
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una tasa de cambio por ID.
 * GET /api/exchange-rates/:id
 */
export const getExchangeRateById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const exchangeRate = await getExchangeRateByIdService(id);

    res.status(200).json({
      success: true,
      data: exchangeRate,
    });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una tasa de cambio existente.
 * PUT /api/exchange-rates/:id o PATCH /api/exchange-rates/:id
 */
export const updateExchangeRate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { rate, source, effectiveFrom, effectiveTo, isActive } = req.body;

    const updated = await updateExchangeRateService(id, {
      rate,
      source,
      effectiveFrom,
      effectiveTo,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Tasa de cambio actualizada exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una tasa de cambio.
 * DELETE /api/exchange-rates/:id
 */
export const deleteExchangeRate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteExchangeRateService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
