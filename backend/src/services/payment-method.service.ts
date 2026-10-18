import { prisma } from '#config/prisma.js';
import {
  type CreatePaymentMethodDTO,
  type UpdatePaymentMethodDTO,
  type PaymentMethodQueryDTO,
  type PaymentMethodWithCount,
  type PaginatedPaymentMethodsResult,
} from '#types/payment-method.types.js';

export class PaymentMethodError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'PaymentMethodError';
    this.statusCode = statusCode;
  }
}

/**
 * Crear un nuevo método de pago en el sistema (ej. Pago Móvil, Zelle, Efectivo, Binance Pay).
 */
export const createPaymentMethod = async (
  dto: CreatePaymentMethodDTO
): Promise<PaymentMethodWithCount> => {
  const name = dto.name?.trim();
  if (!name) {
    throw new PaymentMethodError(
      'El nombre del método de pago es obligatorio',
      400
    );
  }

  // Verificar si ya existe un método con el mismo nombre (insensible a mayúsculas)
  const existing = await prisma.paymentMethod.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    throw new PaymentMethodError(
      `Ya existe un método de pago con el nombre "${name}"`,
      409
    );
  }

  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      name,
      requiresReference: dto.requiresReference ?? true,
      isActive: dto.isActive ?? true,
    },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          paymentTransactions: true,
        },
      },
    },
  });

  return paymentMethod;
};

/**
 * Listar métodos de pago con filtros de estado, requerimiento de referencia y paginación.
 */
export const getPaymentMethods = async (
  query: PaymentMethodQueryDTO
): Promise<PaginatedPaymentMethodsResult> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.isActive !== undefined) {
    where.isActive = Boolean(query.isActive);
  }

  if (query.requiresReference !== undefined) {
    where.requiresReference = Boolean(query.requiresReference);
  }

  if (query.search && query.search.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const allowedSortBy = ['name', 'createdAt', 'updatedAt'];
  const sortBy = allowedSortBy.includes(query.sortBy as string)
    ? (query.sortBy as string)
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  const [total, methods] = await Promise.all([
    prisma.paymentMethod.count({ where }),
    prisma.paymentMethod.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            financialAccounts: true,
            paymentTransactions: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: methods,
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
 * Obtener detalle de un método de pago por ID.
 */
export const getPaymentMethodById = async (
  id: string
): Promise<PaymentMethodWithCount> => {
  if (!id) {
    throw new PaymentMethodError('El ID del método de pago es requerido', 400);
  }

  const method = await prisma.paymentMethod.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          paymentTransactions: true,
        },
      },
    },
  });

  if (!method) {
    throw new PaymentMethodError('Método de pago no encontrado', 404);
  }

  return method;
};

/**
 * Actualizar un método de pago existente.
 */
export const updatePaymentMethod = async (
  id: string,
  dto: UpdatePaymentMethodDTO
): Promise<PaymentMethodWithCount> => {
  if (!id) {
    throw new PaymentMethodError('El ID del método de pago es requerido', 400);
  }

  const existing = await prisma.paymentMethod.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new PaymentMethodError('Método de pago no encontrado', 404);
  }

  const updateData: any = {};

  if (dto.name !== undefined) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new PaymentMethodError('El nombre no puede estar vacío', 400);
    }

    const duplicate = await prisma.paymentMethod.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new PaymentMethodError(
        `Ya existe otro método de pago con el nombre "${trimmedName}"`,
        409
      );
    }

    updateData.name = trimmedName;
  }

  if (dto.requiresReference !== undefined) {
    updateData.requiresReference = Boolean(dto.requiresReference);
  }

  if (dto.isActive !== undefined) {
    updateData.isActive = Boolean(dto.isActive);
  }

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          financialAccounts: true,
          paymentTransactions: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Eliminar un método de pago.
 * Protege contra eliminación si está habilitado en cuentas financieras o posee pagos registrados.
 */
export const deletePaymentMethod = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  if (!id) {
    throw new PaymentMethodError('El ID del método de pago es requerido', 400);
  }

  const method = await prisma.paymentMethod.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          paymentTransactions: true,
        },
      },
    },
  });

  if (!method) {
    throw new PaymentMethodError('Método de pago no encontrado', 404);
  }

  if (method._count.paymentTransactions > 0) {
    throw new PaymentMethodError(
      `No se puede eliminar el método de pago "${method.name}" porque posee ${method._count.paymentTransactions} transacción(es) registrada(s). Puede desactivarlo en su lugar.`,
      400
    );
  }

  if (method._count.financialAccounts > 0) {
    throw new PaymentMethodError(
      `No se puede eliminar el método de pago "${method.name}" porque se encuentra asociado a ${method._count.financialAccounts} cuenta(s) financiera(s). Desvincúlelo de las cuentas primero o desactívelo.`,
      400
    );
  }

  await prisma.paymentMethod.delete({
    where: { id },
  });

  return {
    success: true,
    message: `Método de pago "${method.name}" eliminado exitosamente`,
  };
};

/**
 * Alternar el estado activo / inactivo de un método de pago.
 */
export const togglePaymentMethodStatus = async (
  id: string
): Promise<PaymentMethodWithCount> => {
  if (!id) {
    throw new PaymentMethodError('El ID del método de pago es requerido', 400);
  }

  const method = await prisma.paymentMethod.findUnique({
    where: { id },
  });

  if (!method) {
    throw new PaymentMethodError('Método de pago no encontrado', 404);
  }

  const updated = await prisma.paymentMethod.update({
    where: { id },
    data: {
      isActive: !method.isActive,
    },
    include: {
      _count: {
        select: {
          financialAccounts: true,
          paymentTransactions: true,
        },
      },
    },
  });

  return updated;
};
