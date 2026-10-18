import { type Response, type NextFunction } from 'express';
import {
  createMeasurementUnit as createMeasurementUnitService,
  getMeasurementUnits as getMeasurementUnitsService,
  getMeasurementUnitById as getMeasurementUnitByIdService,
  updateMeasurementUnit as updateMeasurementUnitService,
  deleteMeasurementUnit as deleteMeasurementUnitService,
  toggleMeasurementUnitStatus as toggleMeasurementUnitStatusService,
  MeasurementUnitError,
} from '#services/measurement-unit.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear una nueva unidad de medida.
 * POST /api/measurement-units
 */
export const createMeasurementUnit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, abbreviation, allowsDecimals, isActive } = req.body;

    const unit = await createMeasurementUnitService({
      name,
      abbreviation,
      allowsDecimals,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Unidad de medida creada exitosamente',
      data: unit,
    });
  } catch (error) {
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar unidades de medida con paginación, filtros y búsqueda.
 * GET /api/measurement-units
 */
export const getMeasurementUnits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, allowsDecimals, page, limit, sortBy, sortOrder } =
      req.query;

    const result = await getMeasurementUnitsService({
      search: search as string,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
          : undefined,
      allowsDecimals:
        allowsDecimals !== undefined
          ? allowsDecimals === 'true' || allowsDecimals === '1'
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
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una unidad de medida por ID.
 * GET /api/measurement-units/:id
 */
export const getMeasurementUnitById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const unit = await getMeasurementUnitByIdService(id);

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una unidad de medida.
 * PUT /api/measurement-units/:id o PATCH /api/measurement-units/:id
 */
export const updateMeasurementUnit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, abbreviation, allowsDecimals, isActive } = req.body;

    const unit = await updateMeasurementUnitService(id, {
      name,
      abbreviation,
      allowsDecimals,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Unidad de medida actualizada exitosamente',
      data: unit,
    });
  } catch (error) {
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una unidad de medida (si no tiene productos asociados).
 * DELETE /api/measurement-units/:id
 */
export const deleteMeasurementUnit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteMeasurementUnitService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de una unidad de medida.
 * PATCH /api/measurement-units/:id/status
 */
export const toggleMeasurementUnitStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const unit = await toggleMeasurementUnitStatusService(id);

    res.status(200).json({
      success: true,
      message: `Unidad de medida ${unit.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: unit,
    });
  } catch (error) {
    if (error instanceof MeasurementUnitError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
