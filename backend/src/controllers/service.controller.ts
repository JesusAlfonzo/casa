import { type Response, type NextFunction } from 'express';
import {
  createServiceType as createServiceTypeService,
  getServiceTypes as getServiceTypesService,
  getServiceTypeById as getServiceTypeByIdService,
  updateServiceType as updateServiceTypeService,
  toggleServiceTypeStatus as toggleServiceTypeStatusService,
  deleteServiceType as deleteServiceTypeService,
  createService as createServiceService,
  getServices as getServicesService,
  getServiceById as getServiceByIdService,
  updateService as updateServiceService,
  toggleServiceStatus as toggleServiceStatusService,
  deleteService as deleteServiceService,
  ServiceError,
} from '#services/service.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

// ============================================================================
// SERVICETYPE CONTROLLERS
// ============================================================================

/**
 * Crear un nuevo tipo de servicio.
 * POST /api/service-types
 */
export const createServiceType = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, isActive } = req.body;
    const serviceType = await createServiceTypeService({
      name,
      description,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Tipo de servicio creado exitosamente',
      data: serviceType,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar tipos de servicio con filtros y paginación.
 * GET /api/service-types
 */
export const getServiceTypes = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isActive, page, limit, sortBy, sortOrder } = req.query;

    const result = await getServiceTypesService({
      search: search as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
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
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un tipo de servicio por ID.
 * GET /api/service-types/:id
 */
export const getServiceTypeById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const serviceType = await getServiceTypeByIdService(id);

    res.json({
      success: true,
      data: serviceType,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar datos de un tipo de servicio.
 * PUT/PATCH /api/service-types/:id
 */
export const updateServiceType = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, description, isActive } = req.body;

    const serviceType = await updateServiceTypeService(id, {
      name,
      description,
      isActive,
    });

    res.json({
      success: true,
      message: 'Tipo de servicio actualizado exitosamente',
      data: serviceType,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar estado activo/inactivo de un tipo de servicio.
 * PATCH /api/service-types/:id/status
 */
export const toggleServiceTypeStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const serviceType = await toggleServiceTypeStatusService(id);

    res.json({
      success: true,
      message: `Tipo de servicio ${serviceType.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: serviceType,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un tipo de servicio sin servicios vinculados.
 * DELETE /api/service-types/:id
 */
export const deleteServiceType = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteServiceTypeService(id);

    res.json({
      success: true,
      message: 'Tipo de servicio eliminado exitosamente',
      data: deleted,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// ============================================================================
// SERVICE (CATALOG) CONTROLLERS
// ============================================================================

/**
 * Crear un nuevo servicio en el catálogo.
 * POST /api/services
 */
export const createService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      code,
      name,
      description,
      serviceTypeId,
      basePrice,
      defaultDurationDays,
      requiresStreamingAccount,
      isFullAccountSale,
      isActive,
    } = req.body;

    const service = await createServiceService({
      code,
      name,
      description,
      serviceTypeId,
      basePrice,
      defaultDurationDays,
      requiresStreamingAccount,
      isFullAccountSale,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente en el catálogo',
      data: service,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar servicios con filtros y paginación.
 * GET /api/services
 */
export const getServices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      serviceTypeId,
      requiresStreamingAccount,
      isFullAccountSale,
      isActive,
      minPrice,
      maxPrice,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getServicesService({
      search: search as string,
      serviceTypeId: serviceTypeId as string,
      requiresStreamingAccount:
        requiresStreamingAccount !== undefined
          ? requiresStreamingAccount === 'true'
          : undefined,
      isFullAccountSale:
        isFullAccountSale !== undefined
          ? isFullAccountSale === 'true'
          : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
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
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un servicio por ID.
 * GET /api/services/:id
 */
export const getServiceById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const service = await getServiceByIdService(id);

    res.json({
      success: true,
      data: service,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar información de un servicio.
 * PUT/PATCH /api/services/:id
 */
export const updateService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      code,
      name,
      description,
      serviceTypeId,
      basePrice,
      defaultDurationDays,
      requiresStreamingAccount,
      isFullAccountSale,
      isActive,
    } = req.body;

    const service = await updateServiceService(id, {
      code,
      name,
      description,
      serviceTypeId,
      basePrice,
      defaultDurationDays,
      requiresStreamingAccount,
      isFullAccountSale,
      isActive,
    });

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: service,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar estado activo/inactivo de un servicio.
 * PATCH /api/services/:id/status
 */
export const toggleServiceStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const service = await toggleServiceStatusService(id);

    res.json({
      success: true,
      message: `Servicio ${service.isActive ? 'activado' : 'desactivado'} exitosamente`,
      data: service,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar un servicio sin registros vinculados.
 * DELETE /api/services/:id
 */
export const deleteService = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteServiceService(id);

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente',
      data: deleted,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
