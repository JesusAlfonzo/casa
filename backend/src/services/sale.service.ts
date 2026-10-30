import {
  Prisma,
  type Sale,
  type SaleOutputType,
  type SaleStatus,
  type SaleItemType,
  type InventoryMovementType,
} from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type CreateSaleDTO,
  type CreateSaleItemDTO,
  type CreateSalePaymentDTO,
  type SaleQueryDTO,
  type SaleWithDetails,
  type PaginatedSalesResult,
  type SaleStats,
} from '#types/sale.types.js';

export class SaleError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SaleError';
    this.statusCode = statusCode;
  }
}

/**
 * Genera un número de comprobante o nota de entrega único.
 */
const generateDocumentNumber = (outputType?: SaleOutputType): string => {
  let prefix = 'VTA';
  if (outputType === 'INTERNAL_CONSUMPTION') prefix = 'CON';
  else if (outputType === 'SHRINKAGE') prefix = 'MER';
  else if (outputType === 'OUTBOUND_ADJUSTMENT') prefix = 'AJU';

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${yearMonth}-${random}`;
};

/**
 * Enriquecer venta con alias de compatibilidad (orderNumber = documentNumber).
 */
const withOrderNumberAlias = (sale: any): SaleWithDetails => {
  if (!sale) return sale;
  return {
    ...sale,
    orderNumber: sale.documentNumber,
  };
};

/**
 * Validador de importes decimales no negativos.
 */
const parseDecimalNonNegative = (
  val: number | string | Prisma.Decimal | null | undefined,
  field: string
): Prisma.Decimal => {
  if (val === null || val === undefined || val === '') {
    return new Prisma.Decimal(0);
  }
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.isNegative()) {
      throw new SaleError(`El valor de ${field} no puede ser negativo`, 400);
    }
    return dec;
  } catch (error: any) {
    if (error instanceof SaleError) throw error;
    throw new SaleError(
      `El valor ingresado en ${field} no es un número válido`,
      400
    );
  }
};

/**
 * Validador de cantidades positivas mayores a cero.
 */
const parsePositiveQty = (
  val: number | string | Prisma.Decimal | null | undefined,
  field: string
): Prisma.Decimal => {
  if (val === null || val === undefined || val === '') {
    return new Prisma.Decimal(1);
  }
  try {
    const dec = new Prisma.Decimal(val);
    if (dec.lte(0)) {
      throw new SaleError(`La cantidad en ${field} debe ser mayor a 0`, 400);
    }
    return dec;
  } catch (error: any) {
    if (error instanceof SaleError) throw error;
    throw new SaleError(`La cantidad ingresada en ${field} no es válida`, 400);
  }
};

/**
 * Parsear fecha.
 */
const parseDate = (val: string | Date | undefined, field: string): Date => {
  if (!val) return new Date();
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    throw new SaleError(`La fecha en ${field} no es válida`, 400);
  }
  return d;
};

/**
 * Registrar una nueva venta o salida de inventario / servicios / suscripciones.
 */
export const createSale = async (
  dto: CreateSaleDTO,
  userId?: string | null
): Promise<SaleWithDetails> => {
  if (!dto.currencyId) {
    throw new SaleError('La moneda de la venta es obligatoria', 400);
  }

  if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
    throw new SaleError(
      'Debe incluir al menos un ítem o producto en la venta',
      400
    );
  }

  // 1. Validar existencia y estado de la moneda
  const currency = await prisma.currency.findUnique({
    where: { id: dto.currencyId },
  });
  if (!currency || !currency.isActive) {
    throw new SaleError(
      'La moneda seleccionada no existe o se encuentra inactiva',
      404
    );
  }

  // 2. Validar tasa de cambio si fue provista
  let exchangeRateValue = new Prisma.Decimal(1);
  if (dto.exchangeRateId) {
    const rateRecord = await prisma.exchangeRate.findUnique({
      where: { id: dto.exchangeRateId },
    });
    if (!rateRecord || !rateRecord.isActive) {
      throw new SaleError(
        'La tasa de cambio seleccionada no existe o se encuentra inactiva',
        404
      );
    }
    exchangeRateValue = rateRecord.rate;
  } else if (dto.exchangeRateValue) {
    exchangeRateValue = parseDecimalNonNegative(
      dto.exchangeRateValue,
      'tasa de cambio'
    );
    if (exchangeRateValue.lte(0)) {
      throw new SaleError('La tasa de cambio debe ser mayor a cero', 400);
    }
  }

  // 3. Validar cliente si fue provisto
  if (dto.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer || !customer.isActive || customer.deletedAt) {
      throw new SaleError(
        'El cliente seleccionado no existe, está inactivo o fue eliminado',
        404
      );
    }
  }

  // 4. Validar y procesar cada línea de venta (Ítems polimórficos)
  const isQuote = dto.status === 'QUOTE';
  let subtotalAccum = new Prisma.Decimal(0);
  let taxAccum = new Prisma.Decimal(0);

  const processedItems: Array<{
    itemType: SaleItemType;
    productId: string | null;
    inventoryId: string | null;
    serviceId: string | null;
    subscriptionId: string | null;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    historicalUnitCost: Prisma.Decimal | null;
    discountAmount: Prisma.Decimal;
    taxPercentage: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    currentInventoryStock?: Prisma.Decimal;
  }> = [];

  for (let i = 0; i < dto.items.length; i++) {
    const item = dto.items[i];
    const itemIndex = i + 1;

    const quantity = parsePositiveQty(
      item.quantity,
      `la cantidad del ítem #${itemIndex}`
    );
    const discountAmount = parseDecimalNonNegative(
      item.discountAmount,
      `el descuento del ítem #${itemIndex}`
    );
    const taxPercentage = parseDecimalNonNegative(
      item.taxPercentage,
      `el impuesto del ítem #${itemIndex}`
    );

    let unitPrice = parseDecimalNonNegative(
      item.unitPrice,
      `el precio unitario del ítem #${itemIndex}`
    );
    let historicalUnitCost: Prisma.Decimal | null = null;
    let description = item.description?.trim() || '';
    let productId: string | null = null;
    let inventoryId: string | null = null;
    let serviceId: string | null = null;
    let subscriptionId: string | null = null;
    let currentInventoryStock: Prisma.Decimal | undefined;

    if (item.itemType === 'PRODUCT') {
      if (!item.productId) {
        throw new SaleError(
          `Debe especificar el producto en el ítem #${itemIndex}`,
          400
        );
      }
      productId = item.productId;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventories: true },
      });

      if (!product || !product.isActive || product.deletedAt) {
        throw new SaleError(
          `El producto del ítem #${itemIndex} no existe o se encuentra inactivo`,
          404
        );
      }

      if (!description) {
        description = product.name;
      }

      if (unitPrice.isZero()) {
        unitPrice = product.baseSalePrice;
      }
      historicalUnitCost = product.averageCost;

      // Resolver almacén / inventario
      let targetInventory: any = null;
      if (item.inventoryId) {
        targetInventory = product.inventories.find(
          (inv) => inv.id === item.inventoryId
        );
        if (!targetInventory) {
          throw new SaleError(
            `El almacén seleccionado en el ítem #${itemIndex} no corresponde al producto "${product.name}"`,
            400
          );
        }
      } else {
        // Asignar primer inventario con stock suficiente, o el primer inventario existente
        targetInventory =
          product.inventories.find((inv) =>
            inv.currentQuantity.gte(quantity)
          ) || product.inventories[0];
      }

      if (!targetInventory) {
        throw new SaleError(
          `El producto "${product.name}" no posee ningún registro de inventario o almacén registrado`,
          400
        );
      }

      inventoryId = targetInventory.id;
      currentInventoryStock = targetInventory.currentQuantity;

      // Validar stock disponible si no es cotización
      if (!isQuote && targetInventory.currentQuantity.lt(quantity)) {
        throw new SaleError(
          `Stock insuficiente para "${product.name}". Disponible: ${targetInventory.currentQuantity}, Solicitado: ${quantity}`,
          400
        );
      }
    } else if (item.itemType === 'SERVICE') {
      if (!item.serviceId) {
        throw new SaleError(
          `Debe especificar el servicio en el ítem #${itemIndex}`,
          400
        );
      }
      serviceId = item.serviceId;

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service || !service.isActive) {
        throw new SaleError(
          `El servicio del ítem #${itemIndex} no existe o se encuentra inactivo`,
          404
        );
      }

      if (!description) {
        description = service.name;
      }

      if (unitPrice.isZero()) {
        unitPrice = service.basePrice;
      }
    } else if (item.itemType === 'SUBSCRIPTION') {
      if (item.subscriptionId) {
        subscriptionId = item.subscriptionId;
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          include: { service: true },
        });

        if (!subscription) {
          throw new SaleError(
            `La suscripción especificada en el ítem #${itemIndex} no existe`,
            404
          );
        }

        serviceId = subscription.serviceId;
        if (!description) {
          description = `${subscription.service.name} (Suscripción ${subscription.code})`;
        }
        if (unitPrice.isZero()) {
          unitPrice = subscription.agreedPrice;
        }
      } else if (item.serviceId) {
        serviceId = item.serviceId;
        const service = await prisma.service.findUnique({
          where: { id: serviceId },
        });

        if (!service || !service.isActive) {
          throw new SaleError(
            `El servicio de suscripción del ítem #${itemIndex} no existe o se encuentra inactivo`,
            404
          );
        }

        if (!description) {
          description = `${service.name} (Nueva suscripción)`;
        }
        if (unitPrice.isZero()) {
          unitPrice = service.basePrice;
        }
      } else {
        throw new SaleError(
          `Debe especificar la suscripción o el servicio en el ítem #${itemIndex}`,
          400
        );
      }
    } else {
      throw new SaleError(
        `Tipo de ítem inválido en línea #${itemIndex}. Tipos permitidos: PRODUCT, SERVICE, SUBSCRIPTION`,
        400
      );
    }

    // Cálculos de subtotal e impuestos de línea
    const lineGross = quantity.mul(unitPrice).minus(discountAmount);
    const lineTax = lineGross.mul(taxPercentage.div(100));
    const lineSubtotal = lineGross.plus(lineTax);

    subtotalAccum = subtotalAccum.plus(lineGross);
    taxAccum = taxAccum.plus(lineTax);

    processedItems.push({
      itemType: item.itemType,
      productId,
      inventoryId,
      serviceId,
      subscriptionId,
      description,
      quantity,
      unitPrice,
      historicalUnitCost,
      discountAmount,
      taxPercentage,
      subtotal: lineSubtotal,
      currentInventoryStock,
    });
  }

  // 5. Cálculos globales de la venta
  const generalDiscount = parseDecimalNonNegative(
    dto.discountAmount,
    'descuento general'
  );
  const total = subtotalAccum.plus(taxAccum).minus(generalDiscount);

  // 6. Validar pagos iniciales si se adjuntaron
  let totalCollected = new Prisma.Decimal(0);
  const processedPayments: Array<{
    financialAccountId: string;
    paymentMethodId: string;
    currencyId: string;
    exchangeRateId: string | null;
    amount: Prisma.Decimal;
    baseCurrencyAmount: Prisma.Decimal;
    reference: string | null;
    receiptUrl: string | null;
    notes: string | null;
    paidAt: Date;
  }> = [];

  if (dto.payments && Array.isArray(dto.payments) && dto.payments.length > 0) {
    for (let p = 0; p < dto.payments.length; p++) {
      const pay = dto.payments[p];
      const payIndex = p + 1;

      if (!pay.financialAccountId) {
        throw new SaleError(
          `La cuenta financiera del pago #${payIndex} es obligatoria`,
          400
        );
      }
      if (!pay.paymentMethodId) {
        throw new SaleError(
          `El método de pago en el pago #${payIndex} es obligatorio`,
          400
        );
      }

      const account = await prisma.financialAccount.findUnique({
        where: { id: pay.financialAccountId },
      });
      if (!account || !account.isActive) {
        throw new SaleError(
          `La cuenta financiera del pago #${payIndex} no existe o se encuentra inactiva`,
          404
        );
      }

      const method = await prisma.paymentMethod.findUnique({
        where: { id: pay.paymentMethodId },
      });
      if (!method || !method.isActive) {
        throw new SaleError(
          `El método de pago del pago #${payIndex} no existe o se encuentra inactivo`,
          404
        );
      }

      const amount = parsePositiveQty(
        pay.amount,
        `el monto del pago #${payIndex}`
      );
      totalCollected = totalCollected.plus(amount);

      const payCurrencyId = pay.currencyId || account.currencyId;
      const baseCurrencyAmount = amount.mul(exchangeRateValue);

      processedPayments.push({
        financialAccountId: pay.financialAccountId,
        paymentMethodId: pay.paymentMethodId,
        currencyId: payCurrencyId,
        exchangeRateId: pay.exchangeRateId || dto.exchangeRateId || null,
        amount,
        baseCurrencyAmount,
        reference: pay.reference?.trim() || null,
        receiptUrl: pay.receiptUrl?.trim() || null,
        notes: pay.notes?.trim() || null,
        paidAt: parseDate(pay.paidAt, `la fecha del pago #${payIndex}`),
      });
    }
  }

  // 7. Determinar estatus final
  let status: SaleStatus = dto.status || 'COMPLETED';
  if (!dto.status) {
    if (totalCollected.gte(total)) {
      status = 'COMPLETED';
    } else if (totalCollected.gt(0)) {
      status = 'PARTIALLY_PAID';
    } else {
      status = 'PENDING_PAYMENT';
    }
  }

  const documentNumber =
    dto.documentNumber?.trim().toUpperCase() ||
    generateDocumentNumber(dto.outputType);

  // Verificar unicidad de número de comprobante
  const existingDoc = await prisma.sale.findUnique({
    where: { documentNumber },
  });
  if (existingDoc) {
    throw new SaleError(
      `Ya existe una venta registrada con el comprobante "${documentNumber}"`,
      409
    );
  }

  const soldAt = parseDate(dto.soldAt, 'fecha de venta');

  // 8. Ejecutar inserción en base de datos con Transacción Atómica
  return await prisma.$transaction(async (tx) => {
    // A) Crear la cabecera de la venta
    const sale = await tx.sale.create({
      data: {
        documentNumber,
        outputType: dto.outputType || 'SALE',
        status,
        customerId: dto.customerId || null,
        userId: userId || null,
        currencyId: dto.currencyId,
        exchangeRateId: dto.exchangeRateId || null,
        exchangeRateValue,
        subtotal: subtotalAccum,
        taxAmount: taxAccum,
        discountAmount: generalDiscount,
        total,
        totalCollected,
        soldAt,
        notes: dto.notes?.trim() || null,
        items: {
          create: processedItems.map((item) => ({
            itemType: item.itemType,
            productId: item.productId,
            inventoryId: item.inventoryId,
            serviceId: item.serviceId,
            subscriptionId: item.subscriptionId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            historicalUnitCost: item.historicalUnitCost,
            discountAmount: item.discountAmount,
            taxPercentage: item.taxPercentage,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // B) Si no es cotización, descontar stock de inventario y asentar Kardex
    if (status !== 'QUOTE') {
      const movementType: InventoryMovementType =
        dto.outputType === 'INTERNAL_CONSUMPTION'
          ? 'SHRINKAGE_OUT'
          : 'SALE_OUT';

      for (const createdItem of sale.items) {
        if (createdItem.itemType === 'PRODUCT' && createdItem.inventoryId) {
          const inv = await tx.inventory.findUnique({
            where: { id: createdItem.inventoryId },
          });

          if (inv) {
            const previousStock = inv.currentQuantity;
            const resultingStock = previousStock.minus(createdItem.quantity);

            // Actualizar stock de inventario
            await tx.inventory.update({
              where: { id: createdItem.inventoryId },
              data: { currentQuantity: resultingStock },
            });

            // Registrar movimiento en Kardex
            await tx.inventoryMovement.create({
              data: {
                inventoryId: createdItem.inventoryId,
                productId: createdItem.productId!,
                movementType,
                quantity: createdItem.quantity,
                previousStock,
                resultingStock,
                unitCost: createdItem.historicalUnitCost,
                saleItemId: createdItem.id,
                userId: userId || null,
                reason: `Venta ${documentNumber} (${createdItem.description})`,
              },
            });
          }
        }
      }
    }

    // C) Procesar pagos iniciales e incrementar saldo de cuentas financieras
    if (processedPayments.length > 0) {
      for (const payment of processedPayments) {
        await tx.paymentTransaction.create({
          data: {
            flowType: 'INFLOW',
            status: 'VERIFIED',
            saleId: sale.id,
            financialAccountId: payment.financialAccountId,
            paymentMethodId: payment.paymentMethodId,
            currencyId: payment.currencyId,
            exchangeRateId: payment.exchangeRateId,
            userId: userId || null,
            amount: payment.amount,
            baseCurrencyAmount: payment.baseCurrencyAmount,
            reference: payment.reference,
            receiptUrl: payment.receiptUrl,
            notes: payment.notes,
            paidAt: payment.paidAt,
          },
        });

        // Actualizar saldo de la cuenta financiera receptora
        await tx.financialAccount.update({
          where: { id: payment.financialAccountId },
          data: {
            currentBalance: { increment: payment.amount },
          },
        });
      }
    }

    // D) Retornar venta completa con relaciones
    const fullSale = await tx.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: {
        customer: true,
        user: true,
        currency: true,
        exchangeRate: true,
        items: {
          include: {
            product: true,
            service: true,
            subscription: true,
            inventory: true,
          },
        },
        payments: {
          include: {
            paymentMethod: true,
            financialAccount: true,
          },
        },
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
      },
    });

    return withOrderNumberAlias(fullSale);
  });
};

/**
 * Listar ventas con filtros avanzados y paginación.
 */
export const getSales = async (
  query: SaleQueryDTO
): Promise<PaginatedSalesResult> => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const where: Prisma.SaleWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { documentNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
      {
        items: {
          some: {
            description: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  if (query.documentNumber?.trim()) {
    where.documentNumber = {
      contains: query.documentNumber.trim(),
      mode: 'insensitive',
    };
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.currencyId) {
    where.currencyId = query.currencyId;
  }

  if (query.outputType) {
    where.outputType = query.outputType;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.itemType || query.productId || query.serviceId) {
    where.items = {
      some: {
        ...(query.itemType ? { itemType: query.itemType } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      },
    };
  }

  if (query.startDate || query.endDate) {
    where.soldAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!isNaN(start.getTime())) where.soldAt.gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!isNaN(end.getTime())) where.soldAt.lte = end;
    }
  }

  const validSortFields: Array<
    'soldAt' | 'total' | 'totalCollected' | 'documentNumber' | 'createdAt'
  > = ['soldAt', 'total', 'totalCollected', 'documentNumber', 'createdAt'];

  const sortBy = validSortFields.includes(query.sortBy as any)
    ? (query.sortBy as any)
    : 'soldAt';
  const sortOrder: Prisma.SortOrder =
    query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: true,
        user: true,
        currency: true,
        exchangeRate: true,
        items: {
          include: {
            product: true,
            service: true,
            subscription: true,
            inventory: true,
          },
        },
        payments: {
          include: {
            paymentMethod: true,
            financialAccount: true,
          },
        },
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    items: items.map(withOrderNumberAlias),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Obtener detalle completo de una venta por ID.
 */
export const getSaleById = async (id: string): Promise<SaleWithDetails> => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      user: true,
      currency: true,
      exchangeRate: true,
      items: {
        include: {
          product: true,
          service: true,
          subscription: true,
          inventory: true,
        },
      },
      payments: {
        include: {
          paymentMethod: true,
          financialAccount: true,
        },
      },
      _count: {
        select: {
          items: true,
          payments: true,
        },
      },
    },
  });

  if (!sale) {
    throw new SaleError('La venta especificada no existe', 404);
  }

  return withOrderNumberAlias(sale);
};

/**
 * Registrar un nuevo pago o abono sobre una venta existente.
 */
export const addSalePayment = async (
  saleId: string,
  dto: CreateSalePaymentDTO,
  userId?: string | null
): Promise<SaleWithDetails> => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
  });

  if (!sale) {
    throw new SaleError('La venta especificada no existe', 404);
  }

  if (sale.status === 'VOIDED') {
    throw new SaleError(
      'No se pueden registrar pagos a una venta anulada',
      400
    );
  }

  if (sale.status === 'QUOTE') {
    throw new SaleError(
      'No se pueden registrar pagos a una cotización. Conviértala a venta primero.',
      400
    );
  }

  if (sale.totalCollected.gte(sale.total)) {
    throw new SaleError('La venta ya se encuentra totalmente cobrada', 400);
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id: dto.financialAccountId },
  });
  if (!account || !account.isActive) {
    throw new SaleError(
      'La cuenta financiera seleccionada no existe o se encuentra inactiva',
      404
    );
  }

  const method = await prisma.paymentMethod.findUnique({
    where: { id: dto.paymentMethodId },
  });
  if (!method || !method.isActive) {
    throw new SaleError(
      'El método de pago seleccionado no existe o se encuentra inactivo',
      404
    );
  }

  const amount = parsePositiveQty(dto.amount, 'el monto del abono');
  const payCurrencyId = dto.currencyId || account.currencyId;
  const baseCurrencyAmount = amount.mul(sale.exchangeRateValue);

  return await prisma.$transaction(async (tx) => {
    // 1. Crear transacción de cobro
    await tx.paymentTransaction.create({
      data: {
        flowType: 'INFLOW',
        status: 'VERIFIED',
        saleId,
        financialAccountId: dto.financialAccountId,
        paymentMethodId: dto.paymentMethodId,
        currencyId: payCurrencyId,
        exchangeRateId: dto.exchangeRateId || sale.exchangeRateId,
        userId: userId || null,
        amount,
        baseCurrencyAmount,
        reference: dto.reference?.trim() || null,
        receiptUrl: dto.receiptUrl?.trim() || null,
        notes: dto.notes?.trim() || null,
        paidAt: parseDate(dto.paidAt, 'fecha de pago'),
      },
    });

    // 2. Incrementar saldo de la cuenta financiera
    await tx.financialAccount.update({
      where: { id: dto.financialAccountId },
      data: { currentBalance: { increment: amount } },
    });

    // 3. Actualizar monto cobrado y estatus de la venta
    const newTotalCollected = sale.totalCollected.plus(amount);
    const newStatus: SaleStatus = newTotalCollected.gte(sale.total)
      ? 'COMPLETED'
      : 'PARTIALLY_PAID';

    await tx.sale.update({
      where: { id: saleId },
      data: {
        totalCollected: newTotalCollected,
        status: newStatus,
      },
    });

    // 4. Retornar venta actualizada
    const updatedSale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: {
        customer: true,
        user: true,
        currency: true,
        exchangeRate: true,
        items: {
          include: {
            product: true,
            service: true,
            subscription: true,
            inventory: true,
          },
        },
        payments: {
          include: {
            paymentMethod: true,
            financialAccount: true,
          },
        },
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
      },
    });

    return withOrderNumberAlias(updatedSale);
  });
};

/**
 * Anular una venta, reintegrando el inventario físico y reversando los pagos realizados.
 */
export const voidSale = async (
  id: string,
  reason?: string,
  userId?: string | null
): Promise<SaleWithDetails> => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!sale) {
    throw new SaleError('La venta especificada no existe', 404);
  }

  if (sale.status === 'VOIDED') {
    throw new SaleError('La venta ya se encuentra anulada', 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Reintegrar stock a inventarios si la venta no era cotización
    if (sale.status !== 'QUOTE') {
      for (const item of sale.items) {
        if (item.itemType === 'PRODUCT' && item.inventoryId && item.productId) {
          const inv = await tx.inventory.findUnique({
            where: { id: item.inventoryId },
          });

          if (inv) {
            const previousStock = inv.currentQuantity;
            const resultingStock = previousStock.plus(item.quantity);

            await tx.inventory.update({
              where: { id: item.inventoryId },
              data: { currentQuantity: resultingStock },
            });

            // Registrar devolución en Kardex
            await tx.inventoryMovement.create({
              data: {
                inventoryId: item.inventoryId,
                productId: item.productId,
                movementType: 'CUSTOMER_RETURN',
                quantity: item.quantity,
                previousStock,
                resultingStock,
                unitCost: item.historicalUnitCost,
                saleItemId: item.id,
                userId: userId || null,
                reason: `Anulación de venta ${sale.documentNumber}${reason ? ': ' + reason : ''}`,
              },
            });
          }
        }
      }
    }

    // 2. Reversar cobros aplicados en cuentas financieras
    for (const payment of sale.payments) {
      if (payment.status === 'VERIFIED') {
        await tx.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            notes: `${payment.notes ? payment.notes + '\n' : ''}[Reembolsado por anulación de venta]`,
          },
        });

        // Descontar saldo de la cuenta financiera
        await tx.financialAccount.update({
          where: { id: payment.financialAccountId },
          data: { currentBalance: { decrement: payment.amount } },
        });
      }
    }

    // 3. Marcar venta como anulada
    const nowStr = new Date().toISOString().split('T')[0];
    const voidNote = `[${nowStr}] Venta anulada${reason ? ': ' + reason : ''}`;
    const newNotes = sale.notes ? `${sale.notes}\n${voidNote}` : voidNote;

    const voided = await tx.sale.update({
      where: { id },
      data: {
        status: 'VOIDED',
        notes: newNotes,
      },
      include: {
        customer: true,
        user: true,
        currency: true,
        exchangeRate: true,
        items: {
          include: {
            product: true,
            service: true,
            subscription: true,
            inventory: true,
          },
        },
        payments: {
          include: {
            paymentMethod: true,
            financialAccount: true,
          },
        },
        _count: {
          select: {
            items: true,
            payments: true,
          },
        },
      },
    });

    return withOrderNumberAlias(voided);
  });
};

/**
 * Obtener estadísticas consolidadas y métricas de facturación / ventas.
 */
export const getSaleStats = async (): Promise<SaleStats> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    totalSales,
    completedSales,
    pendingSales,
    voidedSales,
    aggregateTotal,
    salesTodayAggregate,
  ] = await Promise.all([
    prisma.sale.count(),
    prisma.sale.count({ where: { status: 'COMPLETED' } }),
    prisma.sale.count({
      where: { status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] } },
    }),
    prisma.sale.count({ where: { status: 'VOIDED' } }),
    prisma.sale.aggregate({
      where: { status: { not: 'VOIDED' } },
      _sum: {
        total: true,
        totalCollected: true,
      },
    }),
    prisma.sale.aggregate({
      where: {
        status: { not: 'VOIDED' },
        soldAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _count: true,
      _sum: {
        total: true,
      },
    }),
  ]);

  const totalInvoiced = Number(aggregateTotal._sum.total || 0);
  const totalCollected = Number(aggregateTotal._sum.totalCollected || 0);
  const totalPendingBalance = Math.max(totalInvoiced - totalCollected, 0);

  return {
    totalSales,
    completedSales,
    pendingSales,
    voidedSales,
    totalInvoiced: Number(totalInvoiced.toFixed(2)),
    totalCollected: Number(totalCollected.toFixed(2)),
    totalPendingBalance: Number(totalPendingBalance.toFixed(2)),
    salesTodayCount: salesTodayAggregate._count,
    salesTodayAmount: Number((salesTodayAggregate._sum.total || 0).toFixed(2)),
  };
};
