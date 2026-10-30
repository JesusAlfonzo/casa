import { type Response, type NextFunction } from 'express';
import {
  getSalesReport as getSalesReportService,
  getInventoryReport as getInventoryReportService,
  getCashflowReport as getCashflowReportService,
  getSubscriptionsReport as getSubscriptionsReportService,
} from '#services/report.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

export const getSalesReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, status, customerId } = req.query;

    const result = await getSalesReportService({
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      customerId: customerId as string,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { locationId } = req.query;

    const result = await getInventoryReportService(locationId as string);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCashflowReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await getCashflowReportService(
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionsReport = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getSubscriptionsReportService();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
