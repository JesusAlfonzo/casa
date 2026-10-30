import { type Response, type NextFunction } from 'express';
import {
  createStreamingAccount as createStreamingAccountService,
  getStreamingAccounts as getStreamingAccountsService,
  getStreamingAccountById as getStreamingAccountByIdService,
  updateStreamingAccount as updateStreamingAccountService,
  deleteStreamingAccount as deleteStreamingAccountService,
  getStreamingAccountStats as getStreamingAccountStatsService,
  getProfilesByAccountId as getProfilesByAccountIdService,
  getProfileById as getProfileByIdService,
  updateStreamingProfile as updateStreamingProfileService,
  toggleProfileOccupied as toggleProfileOccupiedService,
  StreamingError,
} from '#services/streaming.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

// ============================================================================
// STREAMING ACCOUNT CONTROLLERS
// ============================================================================

/**
 * Registrar una nueva cuenta de streaming maestra y crear sus perfiles.
 * POST /api/streaming-accounts
 */
export const createStreamingAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      serviceId,
      supplierId,
      purchaseId,
      accessEmail,
      accessPassword,
      securityPin,
      profileCapacity,
      accountCost,
      supplierStartDate,
      supplierCutoffDate,
      status,
      notes,
      profiles,
    } = req.body;

    const account = await createStreamingAccountService({
      serviceId,
      supplierId,
      purchaseId,
      accessEmail,
      accessPassword,
      securityPin,
      profileCapacity,
      accountCost,
      supplierStartDate,
      supplierCutoffDate,
      status,
      notes,
      profiles,
    });

    res.status(201).json({
      success: true,
      message: 'Cuenta de streaming registrada exitosamente',
      data: account,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar cuentas maestras de streaming con filtros avanzados y paginación.
 * GET /api/streaming-accounts
 */
export const getStreamingAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      serviceId,
      supplierId,
      purchaseId,
      status,
      expiringBefore,
      expiringWithinDays,
      hasAvailableProfiles,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getStreamingAccountsService({
      search: search as string,
      serviceId: serviceId as string,
      supplierId: supplierId as string,
      purchaseId: purchaseId as string,
      status: status as any,
      expiringBefore: expiringBefore as string,
      expiringWithinDays:
        expiringWithinDays !== undefined
          ? Number(expiringWithinDays)
          : undefined,
      hasAvailableProfiles:
        hasAvailableProfiles !== undefined
          ? hasAvailableProfiles === 'true'
          : undefined,
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
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener estadísticas globales de las cuentas de streaming.
 * GET /api/streaming-accounts/stats
 */
export const getStreamingAccountStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getStreamingAccountStatsService();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una cuenta de streaming por ID con sus perfiles.
 * GET /api/streaming-accounts/:id
 */
export const getStreamingAccountById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const account = await getStreamingAccountByIdService(id);

    res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar cuenta maestra de streaming y perfiles.
 * PUT/PATCH /api/streaming-accounts/:id
 */
export const updateStreamingAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      serviceId,
      supplierId,
      purchaseId,
      accessEmail,
      accessPassword,
      securityPin,
      profileCapacity,
      accountCost,
      supplierStartDate,
      supplierCutoffDate,
      status,
      notes,
    } = req.body;

    const account = await updateStreamingAccountService(id, {
      serviceId,
      supplierId,
      purchaseId,
      accessEmail,
      accessPassword,
      securityPin,
      profileCapacity,
      accountCost,
      supplierStartDate,
      supplierCutoffDate,
      status,
      notes,
    });

    res.json({
      success: true,
      message: 'Cuenta de streaming actualizada exitosamente',
      data: account,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una cuenta de streaming si no tiene suscripciones.
 * DELETE /api/streaming-accounts/:id
 */
export const deleteStreamingAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const deleted = await deleteStreamingAccountService(id);

    res.json({
      success: true,
      message: 'Cuenta de streaming eliminada exitosamente',
      data: deleted,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

// ============================================================================
// STREAMING PROFILE CONTROLLERS
// ============================================================================

/**
 * Listar los perfiles/pantallas de una cuenta maestra de streaming.
 * GET /api/streaming-accounts/:id/profiles
 */
export const getAccountProfiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const profiles = await getProfilesByAccountIdService(id);

    res.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de un perfil individual.
 * GET /api/streaming-profiles/:id
 */
export const getProfileById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const profile = await getProfileByIdService(id);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar nombre, pin o estado de ocupación de un perfil.
 * PUT/PATCH /api/streaming-profiles/:id
 */
export const updateStreamingProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { profileName, profilePin, isOccupied } = req.body;

    const profile = await updateStreamingProfileService(id, {
      profileName,
      profilePin,
      isOccupied,
    });

    res.json({
      success: true,
      message: 'Perfil de streaming actualizado exitosamente',
      data: profile,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar u ordenar el estado ocupado/libre de un perfil.
 * PATCH /api/streaming-profiles/:id/toggle-occupied
 */
export const toggleProfileOccupied = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { isOccupied } = req.body;

    const profile = await toggleProfileOccupiedService(id, isOccupied);

    res.json({
      success: true,
      message: `Perfil marcado como ${profile.isOccupied ? 'ocupado' : 'disponible'}`,
      data: profile,
    });
  } catch (error) {
    if (error instanceof StreamingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
