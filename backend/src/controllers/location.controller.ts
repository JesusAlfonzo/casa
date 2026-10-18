import { type Response, type NextFunction } from 'express';
import {
  createLocation as createLocationService,
  getLocations as getLocationsService,
  getLocationTree as getLocationTreeService,
  getLocationById as getLocationByIdService,
  updateLocation as updateLocationService,
  deleteLocation as deleteLocationService,
  toggleLocationStatus as toggleLocationStatusService,
  LocationError,
} from '#services/location.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Crear una nueva ubicación.
 * POST /api/locations
 */
export const createLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, name, description, address, parentLocationId, isActive } =
      req.body;

    const location = await createLocationService({
      code,
      name,
      description,
      address,
      parentLocationId,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Ubicación creada exitosamente',
      data: location,
    });
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar ubicaciones con filtros y paginación.
 * GET /api/locations
 */
export const getLocations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      parentLocationId,
      isRoot,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getLocationsService({
      search: search as string,
      parentLocationId: parentLocationId as string,
      isRoot:
        isRoot !== undefined ? isRoot === 'true' || isRoot === '1' : undefined,
      isActive:
        isActive !== undefined
          ? isActive === 'true' || isActive === '1'
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
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener el árbol jerárquico de ubicaciones.
 * GET /api/locations/tree
 */
export const getLocationTree = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const onlyActive = req.query.all !== 'true';
    const tree = await getLocationTreeService(onlyActive);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una ubicación por ID.
 * GET /api/locations/:id
 */
export const getLocationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const location = await getLocationByIdService(id);

    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una ubicación.
 * PUT /api/locations/:id o PATCH /api/locations/:id
 */
export const updateLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { code, name, description, address, parentLocationId, isActive } =
      req.body;

    const location = await updateLocationService(id, {
      code,
      name,
      description,
      address,
      parentLocationId,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Ubicación actualizada exitosamente',
      data: location,
    });
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una ubicación física o lógica.
 * DELETE /api/locations/:id
 */
export const deleteLocation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteLocationService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de una ubicación.
 * PATCH /api/locations/:id/status
 */
export const toggleLocationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const location = await toggleLocationStatusService(id);

    res.status(200).json({
      success: true,
      message: `Ubicación ${location.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: location,
    });
  } catch (error) {
    if (error instanceof LocationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
