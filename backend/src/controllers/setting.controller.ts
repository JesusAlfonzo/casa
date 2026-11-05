import type { Request, Response, NextFunction } from 'express';
import { settingService } from '#services/setting.service.js';

/**
 * Obtener las configuraciones del sistema.
 */
export async function getSettings(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const settings = await settingService.getAllSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar configuraciones del sistema.
 */
export async function updateSettings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const updated = await settingService.updateSettings(req.body);
    res.json({
      success: true,
      message: 'Configuraciones guardadas exitosamente',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Descargar respaldo del sistema en formato JSON.
 */
export async function exportBackup(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const backup = await settingService.generateSystemBackup();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="backup-casa-erp-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      ...backup,
    });
  } catch (error) {
    next(error);
  }
}
