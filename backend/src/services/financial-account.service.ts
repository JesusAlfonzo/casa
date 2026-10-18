import { Prisma, FinancialAccountType } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateFinancialAccountDTO,
  type UpdateFinancialAccountDTO,
  type FinancialAccountQueryDTO,
  type FinancialAccountWithDetails,
  type PaginatedFinancialAccountsResult,
} from '#types/financial-account.types.js';

export class FinancialAccountError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'FinancialAccountError';
    this.statusCode = statusCode;
  }
}

/**
 * Validador para saldo inicial o importes monetarios.
 */
const parseBalance = (
  val: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal => {
  if (val === null || val === undefined) return new Prisma.Decimal(0);
  try {
    return new Prisma.Decimal(val);
  } catch (error) {
    throw new FinancialAccountError(
      'El saldo ingresado no es un número válido',
      400
    );
  }
};

/**
 * Crear una nueva cuenta financiera, caja registradora o billetera digital.
 */
export const createFinancialAccount = async (
  dto: CreateFinancialAccountDTO
): Promise<FinancialAccountWithDetails> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new FinancialAccountError(
      'El nombre de la cuenta financiera es obligatorio',
      400
    );
  }

  if (!dto.currencyId) {
    throw new FinancialAccountError(
      'La moneda asociada a la cuenta es obligatoria',
      400
    );
  }

  // 1. Validar existencia y estado de la moneda
  const currency = await prisma.currency.findUnique({
    where: { id: dto.currencyId },
  });

  if (!currency || !currency.isActive) {
    throw new FinancialAccountError(
      'La moneda seleccionada no existe o se encuentra inactiva',
      404
    );
  }

  // 2. Validar tipo de cuenta
  const validTypes: FinancialAccountType[] = [
    'DOMESTIC_BANK',
    'INTERNATIONAL_BANK',
    'DIGITAL_WALLET',
    'CASH_REGISTER',
  ];
  const type = dto.type || 'DOMESTIC_BANK';
  if (!validTypes.includes(type)) {
    throw new FinancialAccountError(
      `Tipo de cuenta inválido. Tipos permitidos: ${validTypes.join(', ')}`,
      400
    );
  }

  const currentBalance = parseBalance(dto.initialBalance);

  // 3. Validar métodos de pago asociados si se proveyeron
  if (dto.paymentMethodIds && dto.paymentMethodIds.length > 0) {
    const existingMethodsCount = await prisma.paymentMethod.count({
      where: { id: { in: dto.paymentMethodIds }, isActive: true },
    });
    if (existingMethodsCount !== dto.paymentMethodIds.length) {
      throw new FinancialAccountError(
        'Uno o varios de los métodos de pago asignados no existen o están inactivos',
        400
      );
    }
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.financialAccount.create({
      data: {
        name,
        type,
        bankName: dto.bankName?.trim() || null,
        accountNumber: dto.accountNumber?.trim() || null,
        holderName: dto.holderName?.trim() || null,
        identifier: dto.identifier?.trim() || null,
        currencyId: dto.currencyId,
        currentBalance,
        isActive: dto.isActive ?? true,
        paymentMethods:
          dto.paymentMethodIds && dto.paymentMethodIds.length > 0
            ? {
                create: dto.paymentMethodIds.map((methodId) => ({
                  paymentMethodId: methodId,
                })),
              }
            : undefined,
      },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            decimals: true,
          },
        },
        paymentMethods: {
          include: {
            paymentMethod: {
              select: { id: true, name: true, requiresReference: true },
            },
          },
        },
        _count: {
          select: {
            paymentMethods: true,
            paymentTransactions: true,
          },
        },
      },
    });

    return created;
  });

  return account as any;
};

/**
 * Listar cuentas financieras con filtros de tipo, moneda, estado y búsqueda.
 */
export const getFinancialAccounts = async (
  query: FinancialAccountQueryDTO
): Promise<PaginatedFinancialAccountsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.currencyId) {
    where.currencyId = query.currencyId;
  }

  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { bankName: { contains: term, mode: 'insensitive' } },
      { holderName: { contains: term, mode: 'insensitive' } },
      { identifier: { contains: term, mode: 'insensitive' } },
      { accountNumber: { contains: term, mode: 'insensitive' } },
    ];
  }

  const allowedSortBy = ['name', 'currentBalance', 'createdAt', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, accounts] = await Promise.all([
    prisma.financialAccount.count({ where }),
    prisma.financialAccount.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
            decimals: true,
          },
        },
        paymentMethods: {
          include: {
            paymentMethod: {
              select: { id: true, name: true, requiresReference: true },
            },
          },
        },
        _count: {
          select: {
            paymentMethods: true,
            paymentTransactions: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: accounts as any[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Obtener detalle de una cuenta financiera por ID.
 */
export const getFinancialAccountById = async (
  id: string
): Promise<FinancialAccountWithDetails> => {
  if (!id) {
    throw new FinancialAccountError(
      'El ID de la cuenta financiera es requerido',
      400
    );
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id },
    include: {
      currency: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
          decimals: true,
        },
      },
      paymentMethods: {
        include: {
          paymentMethod: {
            select: { id: true, name: true, requiresReference: true },
          },
        },
      },
      _count: {
        select: {
          paymentMethods: true,
          paymentTransactions: true,
        },
      },
    },
  });

  if (!account) {
    throw new FinancialAccountError('Cuenta financiera no encontrada', 404);
  }

  return account as any;
};

/**
 * Actualizar una cuenta financiera y sincronizar sus métodos de pago admitidos.
 */
export const updateFinancialAccount = async (
  id: string,
  dto: UpdateFinancialAccountDTO
): Promise<FinancialAccountWithDetails> => {
  if (!id) {
    throw new FinancialAccountError(
      'El ID de la cuenta financiera es requerido',
      400
    );
  }

  const existing = await prisma.financialAccount.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new FinancialAccountError('Cuenta financiera no encontrada', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new FinancialAccountError('El nombre no puede estar vacío', 400);
    }
    updateData.name = trimmed;
  }

  if (dto.type !== undefined) {
    updateData.type = dto.type;
  }

  if (dto.bankName !== undefined) {
    updateData.bankName = dto.bankName ? dto.bankName.trim() : null;
  }

  if (dto.accountNumber !== undefined) {
    updateData.accountNumber = dto.accountNumber
      ? dto.accountNumber.trim()
      : null;
  }

  if (dto.holderName !== undefined) {
    updateData.holderName = dto.holderName ? dto.holderName.trim() : null;
  }

  if (dto.identifier !== undefined) {
    updateData.identifier = dto.identifier ? dto.identifier.trim() : null;
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  // Sincronizar métodos de pago asociados si fueron suministrados
  await prisma.$transaction(async (tx) => {
    if (dto.paymentMethodIds !== undefined) {
      // Eliminar asociaciones existentes
      await tx.financialAccountPaymentMethod.deleteMany({
        where: { financialAccountId: id },
      });

      // Crear nuevas asociaciones
      if (dto.paymentMethodIds.length > 0) {
        await tx.financialAccountPaymentMethod.createMany({
          data: dto.paymentMethodIds.map((methodId) => ({
            financialAccountId: id,
            paymentMethodId: methodId,
          })),
        });
      }
    }

    await tx.financialAccount.update({
      where: { id },
      data: updateData,
    });
  });

  return await getFinancialAccountById(id);
};

/**
 * Ajustar o conciliar el saldo de la cuenta financiera.
 */
export const adjustFinancialAccountBalance = async (
  id: string,
  newBalance: number | string | Prisma.Decimal,
  _reason?: string
): Promise<FinancialAccountWithDetails> => {
  if (!id) {
    throw new FinancialAccountError(
      'El ID de la cuenta financiera es requerido',
      400
    );
  }

  const existing = await prisma.financialAccount.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new FinancialAccountError('Cuenta financiera no encontrada', 404);
  }

  const balance = parseBalance(newBalance);

  await prisma.financialAccount.update({
    where: { id },
    data: { currentBalance: balance },
  });

  return await getFinancialAccountById(id);
};

/**
 * Eliminar una cuenta financiera.
 * Protege contra eliminación si posee transacciones financieras registradas.
 */
export const deleteFinancialAccount = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new FinancialAccountError(
      'El ID de la cuenta financiera es requerido',
      400
    );
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          paymentTransactions: true,
        },
      },
    },
  });

  if (!account) {
    throw new FinancialAccountError('Cuenta financiera no encontrada', 404);
  }

  if (account._count.paymentTransactions > 0) {
    throw new FinancialAccountError(
      `No se puede eliminar la cuenta "${account.name}" porque posee ${account._count.paymentTransactions} transacción(es) registrada(s). Puede desactivarla en su lugar.`,
      400
    );
  }

  await prisma.financialAccount.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Cuenta financiera "${account.name}" eliminada exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de una cuenta financiera.
 */
export const toggleFinancialAccountStatus = async (
  id: string
): Promise<FinancialAccountWithDetails> => {
  if (!id) {
    throw new FinancialAccountError(
      'El ID de la cuenta financiera es requerido',
      400
    );
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new FinancialAccountError('Cuenta financiera no encontrada', 404);
  }

  const updated = await prisma.financialAccount.update({
    where: { id },
    data: {
      isActive: !account.isActive,
    },
    include: {
      currency: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
          decimals: true,
        },
      },
      paymentMethods: {
        include: {
          paymentMethod: {
            select: { id: true, name: true, requiresReference: true },
          },
        },
      },
      _count: {
        select: {
          paymentMethods: true,
          paymentTransactions: true,
        },
      },
    },
  });

  return updated as any;
};
