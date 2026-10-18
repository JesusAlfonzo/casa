import { type Response, type NextFunction } from 'express';
import {
  createFinancialAccount as createFinancialAccountService,
  getFinancialAccounts as getFinancialAccountsService,
  getFinancialAccountById as getFinancialAccountByIdService,
  updateFinancialAccount as updateFinancialAccountService,
  adjustFinancialAccountBalance as adjustFinancialAccountBalanceService,
  toggleFinancialAccountStatus as toggleFinancialAccountStatusService,
  deleteFinancialAccount as deleteFinancialAccountService,
  FinancialAccountError,
} from '#services/financial-account.service.js';
import { type AuthenticatedRequest } from '#types/auth.types.js';

/**
 * Registrar una nueva cuenta financiera.
 * POST /api/financial-accounts
 */
export const createFinancialAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      type,
      bankName,
      accountNumber,
      holderName,
      identifier,
      currencyId,
      initialBalance,
      paymentMethodIds,
      isActive,
    } = req.body;

    const account = await createFinancialAccountService({
      name,
      type,
      bankName,
      accountNumber,
      holderName,
      identifier,
      currencyId,
      initialBalance,
      paymentMethodIds,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: 'Cuenta financiera creada exitosamente',
      data: account,
    });
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Listar cuentas financieras con filtros y paginación.
 * GET /api/financial-accounts
 */
export const getFinancialAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      type,
      currencyId,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await getFinancialAccountsService({
      search: search as string,
      type: type as any,
      currencyId: currencyId as string,
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
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Obtener detalle de una cuenta financiera por ID.
 * GET /api/financial-accounts/:id
 */
export const getFinancialAccountById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const account = await getFinancialAccountByIdService(id);

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Actualizar una cuenta financiera.
 * PUT /api/financial-accounts/:id o PATCH /api/financial-accounts/:id
 */
export const updateFinancialAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      type,
      bankName,
      accountNumber,
      holderName,
      identifier,
      paymentMethodIds,
      isActive,
    } = req.body;

    const account = await updateFinancialAccountService(id, {
      name,
      type,
      bankName,
      accountNumber,
      holderName,
      identifier,
      paymentMethodIds,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Cuenta financiera actualizada exitosamente',
      data: account,
    });
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Ajustar o conciliar el saldo de la cuenta financiera.
 * POST /api/financial-accounts/:id/adjust-balance
 */
export const adjustFinancialAccountBalance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { newBalance, reason } = req.body;

    if (newBalance === undefined) {
      return res
        .status(400)
        .json({ error: 'Debe ingresar el nuevo saldo "newBalance"' });
    }

    const account = await adjustFinancialAccountBalanceService(
      id,
      newBalance,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Saldo de cuenta financiera conciliado exitosamente',
      data: account,
    });
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Alternar el estado activo / inactivo de una cuenta financiera.
 * PATCH /api/financial-accounts/:id/status
 */
export const toggleFinancialAccountStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const account = await toggleFinancialAccountStatusService(id);

    res.status(200).json({
      success: true,
      message: `Cuenta financiera ${account.isActive ? 'activada' : 'desactivada'} exitosamente`,
      data: account,
    });
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Eliminar una cuenta financiera.
 * DELETE /api/financial-accounts/:id
 */
export const deleteFinancialAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;

    const result = await deleteFinancialAccountService(id);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof FinancialAccountError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
