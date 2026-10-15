import { type Request, type Response, type NextFunction } from 'express';
import { checkSystemHealth } from '#services/health.service.js';

export const getHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const systemStatus = await checkSystemHealth();

    const statusCode = systemStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(systemStatus);
  } catch (error) {
    next(error);
  }
};
