"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type SalesReportResult,
  type SalesReportItem,
  type InventoryReportResult,
  type InventoryValuationItem,
  type CashflowReportResult,
  type SubscriptionsReportResult,
} from "@/types/report";
import { exportToCSV } from "@/lib/export-csv";
import { cn, useClientNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  CreditCard,
  Tv,
  Calendar,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Helper formatters para badges y estados 100% en Español
const formatSaleStatus = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completada",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "PENDING_PAYMENT":
      return {
        label: "Pendiente",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "PARTIALLY_PAID":
      return {
        label: "Pago Parcial",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "VOIDED":
      return {
        label: "Anulada",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "QUOTE":
      return {
        label: "Presupuesto",
        className: "bg-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

const formatSubscriptionStatus = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Activa",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "EXPIRING_SOON":
      return {
        label: "Por Vencer",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "EXPIRED":
      return {
        label: "Vencida",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "SUSPENDED":
      return {
        label: "Suspendida",
        className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
      };
    case "CANCELLED":
      return {
        label: "Cancelada",
        className: "bg-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

const formatDaysRemainingBadge = (days: number) => {
  if (days < 0) {
    return {
      label: `Vencida (-${Math.abs(days)}d)`,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    };
  }
  if (days === 0) {
    return {
      label: "Vence Hoy",
      className: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse font-bold",
    };
  }
  if (days <= 3) {
    return {
      label: `${days} días (Crítico)`,
      className: "bg-destructive/10 text-destructive border-destructive/20 font-semibold",
    };
  }
  if (days <= 7) {
    return {
      label: `${days} días (Próximo)`,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium",
    };
  }
  return {
    label: `${days} días`,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium",
  };
};

const formatPaymentMethodName = (name: string) => {
  if (!name) return "No especificado";
  const map: Record<string, string> = {
    CASH: "Efectivo",
    CASH_USD: "Efectivo USD",
    CASH_VES: "Efectivo Bs.",
    PAGO_MOVIL: "Pago Móvil",
    BANK_TRANSFER: "Transferencia Bancaria",
    TRANSFER: "Transferencia",
    TRANSFER_VES: "Transferencia Bs.",
    TRANSFER_USD: "Transferencia USD",
    DEBIT_CARD: "Tarjeta de Débito",
    CREDIT_CARD: "Tarjeta de Crédito",
    POINT_OF_SALE: "Punto de Venta",
    DIGITAL_WALLET: "Billetera Digital",
    ZELLE: "Zelle",
    BINANCE: "Binance Pay",
    PAYPAL: "PayPal",
    CREDIT: "Crédito Comercial",
  };
  return map[name.toUpperCase()] || name;
};

const formatAccountType = (type?: string) => {
  switch (type) {
    case "DOMESTIC_BANK":
      return "Banco Nacional";
    case "INTERNATIONAL_BANK":
      return "Banco Internacional";
    case "DIGITAL_WALLET":
      return "Billetera Digital";
    case "CASH_REGISTER":
      return "Caja de Efectivo";
    default:
      return type ? type.replace(/_/g, " ") : "Cuenta Financiera";
  }
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const clientNow = useClientNow();

  // Filters for Sales Report
  const [salesDatePreset, setSalesDatePreset] = useState("ALL");
  const [salesStatus, setSalesStatus] = useState("ALL");

  // Filters for Inventory Report
  const [inventoryLocation, setInventoryLocation] = useState("ALL");
  const [inventorySearch, setInventorySearch] = useState("");

  // Filters for Cashflow Report
  const [cashflowDays, setCashflowDays] = useState("30");

  // Pagination states for all 4 tables
  const [salesPage, setSalesPage] = useState(1);
  const salesLimit = 10;
  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryLimit = 10;
  const [cashflowPage, setCashflowPage] = useState(1);
  const cashflowLimit = 10;
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const subscriptionsLimit = 10;

  // Helper date calculators based on preset (using stable clientNow)
  const getSalesDateRange = () => {
    if (!clientNow) return { startDate: undefined, endDate: undefined };
    const now = new Date(clientNow);
    if (salesDatePreset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      return { startDate: todayStr, endDate: todayStr };
    }
    if (salesDatePreset === "7DAYS") {
      const past = new Date(clientNow - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: past.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    }
    if (salesDatePreset === "30DAYS") {
      const past = new Date(clientNow - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: past.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    }
    return { startDate: undefined, endDate: undefined };
  };

  const { startDate: salesStart, endDate: salesEnd } = getSalesDateRange();

  // 1. Fetch Sales Report
  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
  } = useQuery<SalesReportResult>({
    queryKey: ["report-sales", salesStart, salesEnd, salesStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (salesStart) params.append("startDate", salesStart);
      if (salesEnd) params.append("endDate", salesEnd);
      if (salesStatus !== "ALL") params.append("status", salesStatus);
      return api.get(`/reports/sales?${params.toString()}`);
    },
    enabled: activeTab === "sales",
  });

  // 2. Fetch Inventory Report
  const {
    data: inventoryData,
    isLoading: loadingInventory,
    refetch: refetchInventory,
  } = useQuery<InventoryReportResult>({
    queryKey: ["report-inventory", inventoryLocation],
    queryFn: () => {
      const params = new URLSearchParams();
      if (inventoryLocation !== "ALL")
        params.append("locationId", inventoryLocation);
      return api.get(`/reports/inventory?${params.toString()}`);
    },
    enabled: activeTab === "inventory",
  });

  const { data: locationsData } = useQuery<{
    success: boolean;
    data: Array<{ id: string; name: string }>;
  }>({
    queryKey: ["locations-all"],
    queryFn: () => api.get("/locations"),
    enabled: activeTab === "inventory",
  });

  const locations = locationsData?.data || [];

  // 3. Fetch Cashflow Report
  const {
    data: cashflowData,
    isLoading: loadingCashflow,
    refetch: refetchCashflow,
  } = useQuery<CashflowReportResult>({
    queryKey: ["report-cashflow", cashflowDays, clientNow],
    queryFn: () => {
      const params = new URLSearchParams();
      if (clientNow) {
        const now = new Date(clientNow);
        const past = new Date(
          clientNow - Number(cashflowDays) * 24 * 60 * 60 * 1000
        );
        params.append("startDate", past.toISOString().split("T")[0]);
        params.append("endDate", now.toISOString().split("T")[0]);
      }
      return api.get(`/reports/cashflow?${params.toString()}`);
    },
    enabled: activeTab === "cashflow",
  });

  // 4. Fetch Subscriptions Report
  const {
    data: subscriptionsData,
    isLoading: loadingSubscriptions,
    refetch: refetchSubscriptions,
  } = useQuery<SubscriptionsReportResult>({
    queryKey: ["report-subscriptions"],
    queryFn: () => api.get("/reports/subscriptions"),
    enabled: activeTab === "subscriptions",
  });

  // Export Handlers
  const handleExportSales = () => {
    if (!salesData?.items) return;
    exportToCSV<SalesReportItem>(
      "Reporte_Ventas_Facturacion",
      [
        { header: "Fecha", accessor: (r) => new Date(r.soldAt).toLocaleDateString("es-VE") },
        { header: "Comprobante", accessor: "documentNumber" },
        { header: "Cliente", accessor: "customerName" },
        { header: "RIF / Doc", accessor: (r) => r.customerTaxId || "N/A" },
        { header: "Estado", accessor: (r) => formatSaleStatus(r.status).label },
        { header: "Artículos", accessor: "itemsCount" },
        { header: "Subtotal", accessor: "subtotal" },
        { header: "Impuestos", accessor: "taxAmount" },
        { header: "Total Facturado", accessor: "total" },
        { header: "Total Cobrado", accessor: "totalCollected" },
        { header: "Saldo Pendiente", accessor: "balancePending" },
        { header: "Moneda", accessor: "currencyCode" },
        {
          header: "Métodos de Pago",
          accessor: (r) => r.paymentMethods.map(formatPaymentMethodName).join(" / "),
        },
      ],
      salesData.items
    );
  };

  const handleExportInventory = () => {
    if (!inventoryData?.items) return;
    exportToCSV<InventoryValuationItem>(
      "Reporte_Valoracion_Inventario",
      [
        { header: "SKU", accessor: "sku" },
        { header: "Código Barra", accessor: (r) => r.barcode || "N/A" },
        { header: "Producto", accessor: "productName" },
        { header: "Categoría", accessor: "categoryName" },
        { header: "Almacén", accessor: "warehouseName" },
        {
          header: "Stock Actual",
          accessor: (r) =>
            r.currentStock <= 0
              ? "Agotado (0)"
              : r.currentStock <= 5
                ? `${r.currentStock} uds (Bajo)`
                : `${r.currentStock} uds`,
        },
        { header: "Costo Promedio", accessor: "averageCost" },
        { header: "Valor Total Costo", accessor: "totalCostValuation" },
        { header: "Precio Venta Base", accessor: "baseSalePrice" },
        { header: "Valor Total Venta", accessor: "totalRetailValuation" },
        { header: "Ganancia Proyectada", accessor: "projectedProfit" },
        { header: "Margen Bruto %", accessor: (r) => `${r.profitMarginPercent}%` },
      ],
      inventoryData.items
    );
  };

  const handleExportCashflow = () => {
    if (!cashflowData?.recentTransactions) return;
    exportToCSV<CashflowReportResult["recentTransactions"][number]>(
      "Reporte_Transacciones_Tesoreria",
      [
        { header: "Fecha y Hora", accessor: (r) => new Date(r.date).toLocaleString("es-VE") },
        { header: "Cuenta Financiera", accessor: "accountName" },
        { header: "Tipo de Flujo", accessor: (r) => (r.flowType === "INFLOW" ? "Ingreso" : "Egreso") },
        { header: "Método de Pago", accessor: (r) => formatPaymentMethodName(r.paymentMethodName) },
        { header: "Referencia", accessor: (r) => r.reference || "N/A" },
        { header: "Monto", accessor: "amount" },
        { header: "Moneda", accessor: "currencyCode" },
        { header: "Notas", accessor: (r) => r.notes || "" },
      ],
      cashflowData.recentTransactions
    );
  };

  const handleExportSubscriptions = () => {
    if (!subscriptionsData?.upcomingRenewals) return;
    exportToCSV<SubscriptionsReportResult["upcomingRenewals"][number]>(
      "Reporte_Suscripciones_Streaming",
      [
        { header: "Cliente", accessor: "customerName" },
        { header: "Servicio", accessor: "serviceName" },
        { header: "Perfil / Pantalla", accessor: (r) => r.profileIdentifier || "Cuenta Completa" },
        { header: "Fecha Vencimiento", accessor: (r) => new Date(r.renewAt).toLocaleDateString("es-VE") },
        { header: "Estado", accessor: (r) => formatSubscriptionStatus(r.status).label },
        {
          header: "Días Restantes",
          accessor: (r) => formatDaysRemainingBadge(r.daysRemaining).label,
        },
        { header: "Precio Acordado", accessor: "amount" },
        { header: "Moneda", accessor: "currencyCode" },
      ],
      subscriptionsData.upcomingRenewals
    );
  };

  // Filtered inventory items by text search
  const filteredInventoryItems = React.useMemo(() => {
    const items = inventoryData?.items || [];
    if (!inventorySearch.trim()) return items;
    const term = inventorySearch.toLowerCase();
    return items.filter(
      (item) =>
        item.productName.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term)
    );
  }, [inventoryData, inventorySearch]);

  // Paginated slices for all 4 tables
  const salesItems = salesData?.items || [];
  const salesTotalPages = Math.ceil(salesItems.length / salesLimit) || 1;
  const paginatedSales = salesItems.slice(
    (salesPage - 1) * salesLimit,
    salesPage * salesLimit
  );

  const inventoryTotalPages = Math.ceil(filteredInventoryItems.length / inventoryLimit) || 1;
  const paginatedInventory = filteredInventoryItems.slice(
    (inventoryPage - 1) * inventoryLimit,
    inventoryPage * inventoryLimit
  );

  const cashflowItems = cashflowData?.recentTransactions || [];
  const cashflowTotalPages = Math.ceil(cashflowItems.length / cashflowLimit) || 1;
  const paginatedCashflow = cashflowItems.slice(
    (cashflowPage - 1) * cashflowLimit,
    cashflowPage * cashflowLimit
  );

  const subscriptionsItems = subscriptionsData?.upcomingRenewals || [];
  const subscriptionsTotalPages = Math.ceil(subscriptionsItems.length / subscriptionsLimit) || 1;
  const paginatedSubscriptions = subscriptionsItems.slice(
    (subscriptionsPage - 1) * subscriptionsLimit,
    subscriptionsPage * subscriptionsLimit
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-primary" /> Reportes & Exportación
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Métricas de facturación, valoración de stock, conciliación de tesorería y exportación a Excel / CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-10 px-4 text-xs sm:text-sm font-medium shadow-2xs"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>

          {activeTab === "sales" && (
            <Button size="sm" onClick={handleExportSales} className="h-10 px-4 text-xs sm:text-sm font-medium shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Ventas CSV
            </Button>
          )}

          {activeTab === "inventory" && (
            <Button size="sm" onClick={handleExportInventory} className="h-10 px-4 text-xs sm:text-sm font-medium shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Stock CSV
            </Button>
          )}

          {activeTab === "cashflow" && (
            <Button size="sm" onClick={handleExportCashflow} className="h-10 px-4 text-xs sm:text-sm font-medium shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Flujos CSV
            </Button>
          )}

          {activeTab === "subscriptions" && (
            <Button size="sm" onClick={handleExportSubscriptions} className="h-10 px-4 text-xs sm:text-sm font-medium shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Renovaciones CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/80 p-1.5 h-12 gap-1.5 rounded-xl border border-border/50 print:hidden inline-flex flex-wrap sm:flex-nowrap">
          <TabsTrigger value="sales" className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:shadow-xs">
            Ventas & Facturación
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:shadow-xs">
            Valoración de Inventario
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:shadow-xs">
            Tesorería & Flujos
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:shadow-xs">
            Streaming & Suscripciones
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: VENTAS & FACTURACIÓN */}
        {/* ========================================================================= */}
        <TabsContent value="sales" className="space-y-6">
          {/* Filters Bar */}
          <Card className="border-border shadow-xs print:hidden p-5 sm:p-6 gap-0 py-5 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Período:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "Todo", value: "ALL" },
                    { label: "Hoy", value: "TODAY" },
                    { label: "Últimos 7 días", value: "7DAYS" },
                    { label: "Últimos 30 días", value: "30DAYS" },
                  ].map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      variant={salesDatePreset === p.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSalesDatePreset(p.value);
                        setSalesPage(1);
                      }}
                      className="h-9 text-xs sm:text-sm px-3.5"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={salesStatus}
                  onChange={(e) => {
                    setSalesStatus(e.target.value);
                    setSalesPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="COMPLETED">Completadas</option>
                  <option value="PENDING_PAYMENT">Pendientes de Pago</option>
                  <option value="PARTIALLY_PAID">Parcialmente Cobradas</option>
                  <option value="VOIDED">Anuladas</option>
                </select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchSales()}
                  className="h-9 w-9 shadow-2xs"
                  title="Actualizar datos"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Facturado
                </span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                ${salesData?.summary.totalInvoiced.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {salesData?.summary.totalSalesCount || 0} ventas válidas
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Cobrado
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${salesData?.summary.totalCollected.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Ingresos efectivos
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Cuentas por Cobrar
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                ${salesData?.summary.totalPending.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Saldo pendiente
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Ticket Promedio
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                ${salesData?.summary.averageTicket.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Por transacción
              </p>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-border shadow-xs overflow-hidden gap-0 py-0">
            <div className="py-4.5 px-6 border-b border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  Desglose Detallado de Ventas
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mostrando {salesData?.items.length || 0} operaciones facturadas en el período seleccionado.
                </p>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <Table className="min-w-[950px] w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprobante</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Total Facturado</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Cobrado</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Saldo</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Método(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSales ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                        <span className="text-sm font-medium block">Cargando reporte de ventas...</span>
                      </TableCell>
                    </TableRow>
                  ) : !salesData?.items || salesData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <span className="text-sm font-medium text-foreground block">Sin registros de ventas</span>
                        No se registraron operaciones comerciales en el período seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                        <TableCell className="py-4 px-5 text-xs text-muted-foreground font-medium">
                          {new Date(sale.soldAt).toLocaleDateString("es-VE")}
                        </TableCell>
                        <TableCell className="py-4 px-5 font-mono font-semibold text-primary text-xs">
                          {sale.documentNumber}
                        </TableCell>
                        <TableCell className="py-4 px-5">
                          <div className="font-medium text-foreground text-xs sm:text-sm">
                            {sale.customerName}
                          </div>
                          {sale.customerTaxId && (
                            <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                              {sale.customerTaxId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-center">
                          {(() => {
                            const st = formatSaleStatus(sale.status);
                            return (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] px-2.5 py-0.5 font-medium border", st.className)}
                              >
                                {st.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right font-bold text-foreground text-xs sm:text-sm">
                          ${sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm">
                          ${sale.totalCollected.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right text-amber-600 dark:text-amber-400 font-semibold text-xs sm:text-sm">
                          ${sale.balancePending.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5">
                          <div className="flex flex-wrap gap-1.5">
                            {sale.paymentMethods.map((m, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 font-medium"
                              >
                                {formatPaymentMethodName(m)}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Sales Pagination */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Mostrando página {salesPage} de {salesTotalPages} ({salesItems.length} ventas)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSalesPage((p) => Math.max(p - 1, 1))}
                  disabled={salesPage <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSalesPage((p) => Math.min(p + 1, salesTotalPages))}
                  disabled={salesPage >= salesTotalPages}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: VALORACIÓN DE INVENTARIO */}
        {/* ========================================================================= */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Filters Bar */}
          <Card className="border-border shadow-xs print:hidden p-5 sm:p-6 gap-0 py-5 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, SKU o categoría..."
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setInventoryPage(1);
                  }}
                  className="pl-10 h-10 text-xs sm:text-sm shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={inventoryLocation}
                  onChange={(e) => {
                    setInventoryLocation(e.target.value);
                    setInventoryPage(1);
                  }}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs sm:text-sm shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
                >
                  <option value="ALL">Todos los almacenes</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchInventory()}
                  className="h-10 w-10 shadow-2xs"
                  title="Actualizar datos"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Stock Total
                </span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {inventoryData?.summary.totalStockUnits || 0} uds
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {inventoryData?.summary.totalProductsListed || 0} registros en catálogo
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Valoración a Costo
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                ${inventoryData?.summary.totalCostValuation.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Inversión en almacén
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Valoración a Venta
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${inventoryData?.summary.totalRetailValuation.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Proyección comercial
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Ganancia Proyectada
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                ${inventoryData?.summary.projectedGrossProfit.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Margen estimado: {inventoryData?.summary.averageMarginPercent || 0}%
              </p>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-border shadow-xs overflow-hidden gap-0 py-0">
            <div className="py-4.5 px-6 border-b border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  Detalle de Artículos y Márgenes
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredInventoryItems.length} artículos evaluados según existencias y costos promedio.
                </p>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <Table className="min-w-[1000px] w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Almacén</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Stock Actual</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Costo Unit.</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Total Costo</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Precio Venta</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ganancia Est.</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInventory ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                        <span className="text-sm font-medium block">Calculando valorización de inventario...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredInventoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <span className="text-sm font-medium text-foreground block">Sin productos en inventario</span>
                        No se encontraron registros de artículos para los filtros especificados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInventory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                        <TableCell className="py-4 px-5 font-mono text-muted-foreground text-xs font-medium">
                          {item.sku}
                        </TableCell>
                        <TableCell className="py-4 px-5 font-semibold text-foreground text-xs sm:text-sm">
                          {item.productName}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-muted-foreground text-xs">
                          {item.categoryName}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-muted-foreground text-xs">
                          {item.warehouseName}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2.5 py-0.5 font-medium border font-mono",
                              item.currentStock <= 0
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : item.currentStock <= 5
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            )}
                          >
                            {item.currentStock <= 0
                              ? "Agotado (0)"
                              : item.currentStock <= 5
                                ? `${item.currentStock} uds (Bajo)`
                                : `${item.currentStock} uds`}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right text-muted-foreground text-xs">
                          ${item.averageCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right font-medium text-foreground text-xs sm:text-sm">
                          ${item.totalCostValuation.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right font-medium text-foreground text-xs sm:text-sm">
                          ${item.baseSalePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                          ${item.projectedProfit.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right font-mono text-xs text-muted-foreground">
                          {item.profitMarginPercent}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Inventory Pagination */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Mostrando página {inventoryPage} de {inventoryTotalPages} ({filteredInventoryItems.length} artículos)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInventoryPage((p) => Math.max(p - 1, 1))}
                  disabled={inventoryPage <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInventoryPage((p) => Math.min(p + 1, inventoryTotalPages))}
                  disabled={inventoryPage >= inventoryTotalPages}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: TESORERÍA & FLUJOS */}
        {/* ========================================================================= */}
        <TabsContent value="cashflow" className="space-y-6">
          {/* Controls Bar */}
          <Card className="border-border shadow-xs print:hidden p-5 sm:p-6 gap-0 py-5 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Período de Flujo:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "Últimos 7 días", value: "7" },
                    { label: "Últimos 30 días", value: "30" },
                    { label: "Últimos 90 días", value: "90" },
                  ].map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      variant={cashflowDays === p.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCashflowDays(p.value);
                        setCashflowPage(1);
                      }}
                      className="h-9 text-xs sm:text-sm px-3.5"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchCashflow()}
                className="h-9 w-9 shadow-2xs"
                title="Actualizar datos"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Account Balances Grid */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-4">
            {cashflowData?.accountBalances.map((acc) => (
              <Card key={acc.id} className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
                <div className="flex items-center justify-between pb-3 gap-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                    {acc.accountName}
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 shrink-0">
                    {acc.currencyCode}
                  </Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {acc.currentBalance.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{acc.currencyCode}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {formatAccountType(acc.accountType || acc.type)}
                </p>
              </Card>
            ))}
          </div>

          {/* Flows by currency */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {Object.entries(cashflowData?.flowsByCurrency || {}).map(([currency, flow]) => (
              <Card key={currency} className="border-border shadow-xs p-5 sm:p-6 space-y-3.5 gap-0 py-5 sm:py-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-bold text-sm text-foreground">
                    Flujo Neto ({currency})
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2.5 py-0.5 font-semibold border",
                      flow.net >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                  >
                    {flow.net >= 0 ? "+ Superávit" : "- Déficit"}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <ArrowUpRight className="h-4 w-4" /> Ingresos:
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      +${flow.inflows.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-destructive font-medium">
                      <ArrowDownRight className="h-4 w-4" /> Egresos:
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      -${flow.outflows.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-2.5 font-bold text-foreground">
                    <span>Resultado Neto:</span>
                    <span className={`text-sm ${flow.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      ${flow.net.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent transactions table */}
          <Card className="border-border shadow-xs overflow-hidden gap-0 py-0">
            <div className="py-4.5 px-6 border-b border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  Movimientos de Tesorería Registrados
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Últimas transacciones conciliadas en el período seleccionado.
                </p>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <Table className="min-w-[850px] w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuenta</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Método</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referencia</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCashflow ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                        <span className="text-sm font-medium block">Cargando transacciones de tesorería...</span>
                      </TableCell>
                    </TableRow>
                  ) : !cashflowData?.recentTransactions || cashflowData.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <span className="text-sm font-medium text-foreground block">Sin movimientos</span>
                        No se registraron transacciones monetarias en este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCashflow.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                        <TableCell className="py-4 px-5 text-xs text-muted-foreground font-medium">
                          {new Date(tx.date).toLocaleString("es-VE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell className="py-4 px-5 font-semibold text-foreground text-xs sm:text-sm">
                          {tx.accountName}
                        </TableCell>
                        <TableCell className="py-4 px-5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2.5 py-0.5 font-semibold border",
                              tx.flowType === "INFLOW"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            )}
                          >
                            {tx.flowType === "INFLOW" ? "Ingreso (+)" : "Egreso (-)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-5 text-muted-foreground text-xs font-medium">
                          {formatPaymentMethodName(tx.paymentMethodName)}
                        </TableCell>
                        <TableCell className="py-4 px-5 font-mono text-muted-foreground text-xs">
                          {tx.reference || "N/A"}
                        </TableCell>
                        <TableCell className="py-4 px-5 text-right font-bold text-foreground text-xs sm:text-sm">
                          {tx.flowType === "INFLOW" ? "+" : "-"}
                          {tx.amount.toFixed(2)} {tx.currencyCode}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Cashflow Pagination */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Mostrando página {cashflowPage} de {cashflowTotalPages} ({cashflowItems.length} movimientos)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCashflowPage((p) => Math.max(p - 1, 1))}
                  disabled={cashflowPage <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCashflowPage((p) => Math.min(p + 1, cashflowTotalPages))}
                  disabled={cashflowPage >= cashflowTotalPages}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: STREAMING & SUSCRIPCIONES */}
        {/* ========================================================================= */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Suscripciones Activas
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {subscriptionsData?.summary.totalActive || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Clientes al día
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Vencen en 7 Días
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                {subscriptionsData?.summary.expiringIn7Days || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Gestión de cobranza inmediata
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Cuentas Maestras
                </span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Tv className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {subscriptionsData?.capacity.totalMasterAccounts || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Parque activo con proveedores
              </p>
            </Card>

            <Card className="border-border shadow-xs p-5 sm:p-6 gap-0 py-5 sm:py-6">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Ocupación de Pantallas
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">
                {subscriptionsData?.capacity.occupancyPercent || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {subscriptionsData?.capacity.assignedProfiles || 0} de{" "}
                {subscriptionsData?.capacity.totalProfiles || 0} perfiles
              </p>
            </Card>
          </div>

          {/* Upcoming renewals table */}
          <Card className="border-border shadow-xs overflow-hidden gap-0 py-0">
            <div className="py-4.5 px-6 border-b border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  Próximas Renovaciones y Cobranzas Pendientes
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monitoreo de suscripciones próximas a expirar para corte o renovación anticipada.
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchSubscriptions()}
                className="h-9 w-9 shadow-2xs"
                title="Actualizar datos"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-0 overflow-x-auto">
              <Table className="min-w-[850px] w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Servicio</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil Asignado</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha Vencimiento</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Días Restantes</TableHead>
                    <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Tarifa / Mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSubscriptions ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                        <span className="text-sm font-medium block">Cargando renovaciones de streaming...</span>
                      </TableCell>
                    </TableRow>
                  ) : !subscriptionsData?.upcomingRenewals || subscriptionsData.upcomingRenewals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 px-6 text-center text-xs text-muted-foreground">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <span className="text-sm font-medium text-foreground block">Sin renovaciones pendientes</span>
                        No hay suscripciones activas pendientes por renovación en este momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubscriptions.map((sub) => {
                      const st = formatSubscriptionStatus(sub.status);
                      const days = formatDaysRemainingBadge(sub.daysRemaining);

                      return (
                        <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                          <TableCell className="py-4 px-5 font-semibold text-foreground text-xs sm:text-sm">
                            {sub.customerName}
                          </TableCell>
                          <TableCell className="py-4 px-5">
                            <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                              {sub.serviceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-5 text-muted-foreground text-xs">
                            {sub.profileIdentifier || "Cuenta Completa"}
                          </TableCell>
                          <TableCell className="py-4 px-5 text-xs text-muted-foreground">
                            {new Date(sub.renewAt).toLocaleDateString("es-VE")}
                          </TableCell>
                          <TableCell className="py-4 px-5 text-center">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-2.5 py-0.5 font-medium border", st.className)}
                            >
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-5 text-center">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-2.5 py-0.5 font-medium border", days.className)}
                            >
                              {days.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-5 text-right font-bold text-foreground text-xs sm:text-sm">
                            ${sub.amount.toFixed(2)} {sub.currencyCode}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Subscriptions Pagination */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Mostrando página {subscriptionsPage} de {subscriptionsTotalPages} ({subscriptionsItems.length} renovaciones)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubscriptionsPage((p) => Math.max(p - 1, 1))}
                  disabled={subscriptionsPage <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubscriptionsPage((p) => Math.min(p + 1, subscriptionsTotalPages))}
                  disabled={subscriptionsPage >= subscriptionsTotalPages}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
