import { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma.js';
import {
  type SalesReportQueryDTO,
  type SalesReportResult,
  type SalesReportItem,
  type InventoryReportResult,
  type InventoryValuationItem,
  type CashflowReportResult,
  type SubscriptionsReportResult,
} from '#types/report.types.js';

/**
 * Reporte consolidado de ventas y facturación con desglose y métricas de recaudación.
 */
export const getSalesReport = async (
  query: SalesReportQueryDTO
): Promise<SalesReportResult> => {
  const where: Prisma.SaleWhereInput = {};

  if (query.status && query.status !== 'ALL') {
    where.status = query.status as any;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.startDate || query.endDate) {
    where.soldAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        where.soldAt.gte = start;
      }
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        where.soldAt.lte = end;
      }
    }
  }

  const rawSales = await prisma.sale.findMany({
    where,
    orderBy: { soldAt: 'desc' },
    include: {
      customer: true,
      currency: true,
      items: true,
      payments: {
        include: {
          paymentMethod: true,
        },
      },
    },
  });

  let totalInvoiced = 0;
  let totalCollected = 0;

  const items: SalesReportItem[] = rawSales.map((sale) => {
    const total = Number(sale.total);
    const collected = Number(sale.totalCollected);
    const pending = Math.max(total - collected, 0);

    // Sumar solo si no es anulada
    if (sale.status !== 'VOIDED') {
      totalInvoiced += total;
      totalCollected += collected;
    }

    const paymentMethods = Array.from(
      new Set(sale.payments.map((p) => p.paymentMethod?.name || 'Desconocido'))
    );

    return {
      id: sale.id,
      documentNumber: sale.documentNumber,
      orderNumber: sale.documentNumber,
      soldAt: sale.soldAt,
      customerName: sale.customer
        ? `${sale.customer.name} ${sale.customer.lastName || ''}`.trim()
        : 'Consumidor Final',
      customerTaxId: sale.customer?.documentId || null,
      status: sale.status,
      itemsCount: sale.items.length,
      subtotal: Number(sale.subtotal),
      taxAmount: Number(sale.taxAmount),
      discountAmount: Number(sale.discountAmount),
      total,
      totalCollected: collected,
      balancePending: pending,
      currencyCode: sale.currency?.code || 'USD',
      paymentMethods,
    };
  });

  const totalSalesCount = rawSales.filter((s) => s.status !== 'VOIDED').length;
  const totalPending = Math.max(totalInvoiced - totalCollected, 0);
  const averageTicket = totalSalesCount > 0 ? totalInvoiced / totalSalesCount : 0;

  return {
    summary: {
      totalSalesCount,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      averageTicket: Math.round(averageTicket * 100) / 100,
    },
    items,
  };
};

/**
 * Reporte de existencias y valoración de inventario a costo promedio vs venta.
 */
export const getInventoryReport = async (
  locationId?: string
): Promise<InventoryReportResult> => {
  const where: Prisma.InventoryWhereInput = {
    product: {
      deletedAt: null,
    },
  };

  if (locationId && locationId !== 'ALL') {
    where.locationId = locationId;
  }

  const inventories = await prisma.inventory.findMany({
    where,
    include: {
      product: {
        include: {
          category: true,
        },
      },
      location: true,
    },
    orderBy: [
      { location: { name: 'asc' } },
      { product: { name: 'asc' } },
    ],
  });

  let totalStockUnits = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;

  const items: InventoryValuationItem[] = inventories.map((inv) => {
    const currentStock = Number(inv.currentQuantity);
    const averageCost = Number(inv.product.averageCost || 0);
    const baseSalePrice = Number(inv.product.baseSalePrice || 0);

    const totalCost = currentStock * averageCost;
    const totalRetail = currentStock * baseSalePrice;
    const projectedProfit = totalRetail - totalCost;
    const profitMarginPercent =
      totalRetail > 0 ? ((totalRetail - totalCost) / totalRetail) * 100 : 0;

    totalStockUnits += currentStock;
    totalCostValuation += totalCost;
    totalRetailValuation += totalRetail;

    return {
      id: inv.id,
      sku: inv.product.sku,
      barcode: inv.product.barcode || null,
      productName: inv.product.name,
      categoryName: inv.product.category?.name || 'General',
      warehouseName: inv.location.name,
      currentStock,
      averageCost: Math.round(averageCost * 100) / 100,
      totalCostValuation: Math.round(totalCost * 100) / 100,
      baseSalePrice: Math.round(baseSalePrice * 100) / 100,
      totalRetailValuation: Math.round(totalRetail * 100) / 100,
      projectedProfit: Math.round(projectedProfit * 100) / 100,
      profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
    };
  });

  const projectedGrossProfit = totalRetailValuation - totalCostValuation;
  const averageMarginPercent =
    totalRetailValuation > 0
      ? (projectedGrossProfit / totalRetailValuation) * 100
      : 0;

  return {
    summary: {
      totalStockUnits: Math.round(totalStockUnits * 100) / 100,
      totalProductsListed: items.length,
      totalCostValuation: Math.round(totalCostValuation * 100) / 100,
      totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
      projectedGrossProfit: Math.round(projectedGrossProfit * 100) / 100,
      averageMarginPercent: Math.round(averageMarginPercent * 10) / 10,
    },
    items,
  };
};

/**
 * Reporte de flujo de fondos y saldos por cuenta financiera.
 */
export const getCashflowReport = async (
  startDate?: string,
  endDate?: string
): Promise<CashflowReportResult> => {
  // 1. Obtener saldos de cuentas financieras activas
  const accounts = await prisma.financialAccount.findMany({
    where: { isActive: true },
    include: { currency: true },
    orderBy: { name: 'asc' },
  });

  const accountBalances = accounts.map((acc) => ({
    id: acc.id,
    accountName: acc.name,
    type: acc.type,
    accountType: acc.type,
    currencyCode: acc.currency.code,
    currentBalance: Number(acc.currentBalance),
  }));

  // 2. Transacciones del rango
  const txWhere: Prisma.PaymentTransactionWhereInput = {
    status: 'VERIFIED',
  };

  if (startDate || endDate) {
    txWhere.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        txWhere.createdAt.gte = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        txWhere.createdAt.lte = e;
      }
    }
  }

  const transactions = await prisma.paymentTransaction.findMany({
    where: txWhere,
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      financialAccount: true,
      paymentMethod: true,
      currency: true,
    },
  });

  const flowsByCurrency: Record<
    string,
    { inflows: number; outflows: number; net: number }
  > = {};

  for (const tx of transactions) {
    const curr = tx.currency?.code || 'USD';
    if (!flowsByCurrency[curr]) {
      flowsByCurrency[curr] = { inflows: 0, outflows: 0, net: 0 };
    }

    const amt = Number(tx.amount);
    if (tx.flowType === 'INFLOW') {
      flowsByCurrency[curr].inflows += amt;
      flowsByCurrency[curr].net += amt;
    } else {
      flowsByCurrency[curr].outflows += amt;
      flowsByCurrency[curr].net -= amt;
    }
  }

  // Redondear flujos
  for (const k of Object.keys(flowsByCurrency)) {
    flowsByCurrency[k].inflows =
      Math.round(flowsByCurrency[k].inflows * 100) / 100;
    flowsByCurrency[k].outflows =
      Math.round(flowsByCurrency[k].outflows * 100) / 100;
    flowsByCurrency[k].net = Math.round(flowsByCurrency[k].net * 100) / 100;
  }

  const recentTransactions = transactions.map((tx) => ({
    id: tx.id,
    date: tx.createdAt,
    accountName: tx.financialAccount.name,
    currencyCode: tx.currency?.code || 'USD',
    flowType: tx.flowType as 'INFLOW' | 'OUTFLOW',
    paymentMethodName: tx.paymentMethod.name,
    reference: tx.reference,
    amount: Number(tx.amount),
    notes: tx.notes,
  }));

  return {
    accountBalances,
    flowsByCurrency,
    recentTransactions,
  };
};

/**
 * Reporte de parque streaming y suscripciones de clientes con vencimientos.
 */
export const getSubscriptionsReport = async (): Promise<SubscriptionsReportResult> => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const [
    totalActive,
    expiringIn7Days,
    expiringIn15Days,
    expired,
    totalMasterAccounts,
    totalProfiles,
    assignedProfiles,
    upcomingSubs,
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        expirationDate: { gte: now, lte: in7Days },
      },
    }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        expirationDate: { gte: now, lte: in15Days },
      },
    }),
    prisma.subscription.count({
      where: {
        OR: [
          { status: 'EXPIRED' },
          { status: 'ACTIVE', expirationDate: { lt: now } },
        ],
      },
    }),
    prisma.streamingAccount.count({ where: { status: { not: 'EXPIRED' } } }),
    prisma.streamingProfile.count(),
    prisma.streamingProfile.count({ where: { isOccupied: true } }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      take: 50,
      orderBy: { expirationDate: 'asc' },
      include: {
        customer: true,
        service: true,
        streamingProfile: true,
      },
    }),
  ]);

  const availableProfiles = Math.max(totalProfiles - assignedProfiles, 0);
  const occupancyPercent =
    totalProfiles > 0 ? (assignedProfiles / totalProfiles) * 100 : 0;

  const upcomingRenewals = upcomingSubs.map((sub) => {
    const diffMs = sub.expirationDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      id: sub.id,
      customerName: sub.customer
        ? `${sub.customer.name} ${sub.customer.lastName || ''}`.trim()
        : 'Cliente General',
      serviceName: sub.service.name,
      profileIdentifier: sub.streamingProfile
        ? `Perfil #${sub.streamingProfile.slotNumber} (${sub.streamingProfile.profileName || 'General'})`
        : null,
      renewAt: sub.expirationDate,
      daysRemaining,
      amount: Number(sub.agreedPrice),
      currencyCode: 'USD',
      status: sub.status,
    };
  });

  return {
    summary: {
      totalActive,
      expiringIn7Days,
      expiringIn15Days,
      expired,
    },
    capacity: {
      totalMasterAccounts,
      totalProfiles,
      assignedProfiles,
      availableProfiles,
      occupancyPercent: Math.round(occupancyPercent * 10) / 10,
    },
    upcomingRenewals,
  };
};
