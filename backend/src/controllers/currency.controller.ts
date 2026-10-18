import { type Response, type NextFunction } from 'express';
import {
  createCurrency as createCurrencyService,
  getCurrencies as getCurrenciesService,
  getBaseCurrency as getBaseCurrencyService,
  getCurrencyById as getCurrencyByIdService,
  updateCurrency as updateCurrencyService,
  setBaseCurrency as setBaseCurrencyService,
  toggleCurrencyStatus as toggleCurrencyStatusService,
  deleteCurrency as deleteCurrencyService,
  CurrencyError,
} from '#services/currency.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva moneda.
 * POST /api/currencies
 */
export const createCurrency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, name, symbol, isBase, decimals, isActive } = req.body;

    const currency = await createCurrencyService({
      code,
      name,
      symbol,
      isBase,
      decimals,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Moneda registrada exitosamente',
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar monedas con filtros y paginación.
 * GET /api/currencies
 */
export const getCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, isBase, page, limit, sortBy, sortOrder } =
      req.query;

    const result = await getCurrenciesService({
      search: search as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      isBase:
        isBase !== undefined ? isBase === 'true' || isBase === '1' : undefined,
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
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener la moneda base principal del sistema.
 * GET /api/currencies/base
 */
export const getBaseCurrency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const currency = await getBaseCurrencyService();

    if (!currency) {
      return res.status(404).json({
        error: 'No se ha configurado ninguna moneda base en el sistema',
      });
    }

    res.status(200).json({
      success: true,
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una moneda por ID.
 * GET /api/currencies/:id
 */
export const getCurrencyById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const currency = await getCurrencyByIdService(id);

    res.status(200).json({
      success: true,
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una moneda.
 * PUT /api/currencies/:id o PATCH /api/currencies/:id
 */
export const updateCurrency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { code, name, symbol, isBase, decimals, isActive } = req.body;

    const currency = await updateCurrencyService(id, {
      code,
      name,
      symbol,
      isBase,
      decimals,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Moneda actualizada exitosamente',
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Designar una moneda como la moneda base del sistema.
 * PATCH /api/currencies/:id/base
 */
export const setBaseCurrency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const currency = await setBaseCurrencyService(id);

    res.status(200).json({
      success: true,
      message: `La moneda "${currency.code}" ha sido establecida como la moneda base del sistema`,
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de una moneda.
 * PATCH /api/currencies/:id/status
 */
export const toggleCurrencyStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const currency = await toggleCurrencyStatusService(id);

    res.status(200).json({
      success: true,
      message: `Moneda ${currency.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: currency,
    });
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una moneda (si no es la base y no posee transacciones).
 * DELETE /api/currencies/:id
 */
export const deleteCurrency = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteCurrencyService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof CurrencyError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
