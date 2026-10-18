import { type Response, type NextFunction } from 'express';
import {
  getInventories as getInventoriesService,
  getInventoryById as getInventoryByIdService,
  adjustInventoryStock as adjustInventoryStockService,
  transferInventoryStock as transferInventoryStockService,
  updateInventoryDetails as updateInventoryDetailsService,
  getInventoryMovements as getInventoryMovementsService,
  InventoryError,
} from '#services/inventory.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Listar existencias actuales en almacén con filtros y búsqueda.
 * GET /api/inventories
 */
export const getInventories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      productId,
      locationId,
      categoryId,
      brandId,
      search,
      lowStock,
      hasStock,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getInventoriesService({
      productId: productId as string,
      locationId: locationId as string,
      categoryId: categoryId as string,
      brandId: brandId as string,
      search: search as string,
      lowStock:
        lowStock !== undefined
          ? lowStock === 'true' || lowStock === '1'
          : undefined,
      hasStock:
        hasStock !== undefined
          ? hasStock === 'true' || hasStock === '1'
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
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de inventario por ID.
 * GET /api/inventories/:id
 */
export const getInventoryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const inventory = await getInventoryByIdService(id);

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Realizar ajuste manual de stock (Positivo, Negativo o Merma).
 * POST /api/inventories/adjust
 */
export const adjustInventoryStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, locationId, type, quantity, unitCost, reason } =
      req.body;
    const userId = req.user?.id;

    const result = await adjustInventoryStockService({
      productId,
      locationId,
      type,
      quantity,
      unitCost,
      reason,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Ajuste de inventario aplicado exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Transferir existencias entre dos almacenes.
 * POST /api/inventories/transfer
 */
export const transferInventoryStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, reason } =
      req.body;
    const userId = req.user?.id;

    const result = await transferInventoryStockService({
      productId,
      fromLocationId,
      toLocationId,
      quantity,
      reason,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Transferencia de existencias completada exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar ubicación específica (ej. pasillo, estante o gaveta).
 * PATCH /api/inventories/:id
 */
export const updateInventoryDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { specificLocation } = req.body;

    const updated = await updateInventoryDetailsService(id, {
      specificLocation,
    });

    res.status(200).json({
      success: true,
      message: 'Ubicación física actualizada exitosamente',
      data: updated,
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Consultar auditoría de movimientos de almacén (Kardex).
 * GET /api/inventories/movements
 */
export const getInventoryMovements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      inventoryId,
      productId,
      locationId,
      movementType,
      fromDate,
      toDate,
      page,
      limit,
      sortOrder,
    } = req.query;

    const result = await getInventoryMovementsService({
      inventoryId: inventoryId as string,
      productId: productId as string,
      locationId: locationId as string,
      movementType: movementType as any,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortOrder: sortOrder as any,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
