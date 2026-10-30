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
import { useClientNow } from "@/lib/utils";
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
} from "lucide-react";

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
        { header: "Estado", accessor: "status" },
        { header: "Items", accessor: "itemsCount" },
        { header: "Subtotal", accessor: "subtotal" },
        { header: "Impuestos", accessor: "taxAmount" },
        { header: "Total Facturado", accessor: "total" },
        { header: "Total Cobrado", accessor: "totalCollected" },
        { header: "Saldo Pendiente", accessor: "balancePending" },
        { header: "Moneda", accessor: "currencyCode" },
        { header: "Métodos de Pago", accessor: (r) => r.paymentMethods.join(" / ") },
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
        { header: "Stock Actual", accessor: "currentStock" },
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
        { header: "Tipo de Flujo", accessor: "flowType" },
        { header: "Método de Pago", accessor: "paymentMethodName" },
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
        { header: "Días Restantes", accessor: "daysRemaining" },
        { header: "Precio Acordado", accessor: "amount" },
        { header: "Moneda", accessor: "currencyCode" },
        { header: "Estado", accessor: "status" },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Reportes & Exportación
          </h2>
          <p className="text-sm text-muted-foreground">
            Métricas de facturación, valoración de stock, conciliación de tesorería y exportación a Excel / CSV.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir
          </Button>

          {activeTab === "sales" && (
            <Button size="sm" onClick={handleExportSales} className="h-9 shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Exportar Ventas CSV
            </Button>
          )}

          {activeTab === "inventory" && (
            <Button size="sm" onClick={handleExportInventory} className="h-9 shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Exportar Stock CSV
            </Button>
          )}

          {activeTab === "cashflow" && (
            <Button size="sm" onClick={handleExportCashflow} className="h-9 shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Exportar Flujos CSV
            </Button>
          )}

          {activeTab === "subscriptions" && (
            <Button size="sm" onClick={handleExportSubscriptions} className="h-9 shadow-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Exportar Renovaciones CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted print:hidden">
          <TabsTrigger value="sales" className="text-xs">
            Ventas & Facturación
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">
            Valoración de Inventario
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs">
            Tesorería & Flujos
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">
            Streaming & Suscripciones
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: VENTAS & FACTURACIÓN */}
        {/* ========================================================================= */}
        <TabsContent value="sales" className="space-y-4">
          {/* Filters Bar */}
          <Card className="border-border shadow-xs print:hidden">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Período:
                  </span>
                  <div className="flex items-center gap-1">
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
                        onClick={() => setSalesDatePreset(p.value)}
                        className="h-8 text-xs px-2.5"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={salesStatus}
                    onChange={(e) => setSalesStatus(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs shadow-xs"
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="COMPLETED">Completadas</option>
                    <option value="PENDING_PAYMENT">Pendientes de Pago</option>
                    <option value="PARTIALLY_PAID">Parcialmente Cobradas</option>
                    <option value="VOIDED">Anuladas</option>
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchSales()}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Facturado
                </CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${salesData?.summary.totalInvoiced.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {salesData?.summary.totalSalesCount || 0} ventas válidas
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Cobrado
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${salesData?.summary.totalCollected.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ingresos efectivos
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Cuentas por Cobrar
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  ${salesData?.summary.totalPending.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Saldo pendiente
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Ticket Promedio
                </CardTitle>
                <Percent className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${salesData?.summary.averageTicket.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Por transacción
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">
                  Desglose Detallado de Ventas ({salesData?.items.length || 0})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold">Comprobante</TableHead>
                    <TableHead className="text-xs font-semibold">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Facturado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Cobrado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Saldo</TableHead>
                    <TableHead className="text-xs font-semibold">Método(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSales ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Cargando reporte de ventas...
                      </TableCell>
                    </TableRow>
                  ) : !salesData?.items || salesData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                        No se registraron ventas en el período seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesData.items.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          {new Date(sale.soldAt).toLocaleDateString("es-VE")}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-primary">
                          {sale.documentNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {sale.customerName}
                          </div>
                          {sale.customerTaxId && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {sale.customerTaxId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              sale.status === "COMPLETED"
                                ? "secondary"
                                : sale.status === "VOIDED"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-[9px] px-1.5 py-0"
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ${sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          ${sale.totalCollected.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium">
                          ${sale.balancePending.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sale.paymentMethods.map((m, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: VALORACIÓN DE INVENTARIO */}
        {/* ========================================================================= */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Filters Bar */}
          <Card className="border-border shadow-xs print:hidden">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por producto, SKU o categoría..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-9 h-8 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={inventoryLocation}
                    onChange={(e) => setInventoryLocation(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs shadow-xs"
                  >
                    <option value="ALL">Todos los almacenes</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchInventory()}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Stock Total
                </CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {inventoryData?.summary.totalStockUnits || 0} uds
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {inventoryData?.summary.totalProductsListed || 0} registros en catálogo
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Valorización a Costo
                </CardTitle>
                <Layers className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${inventoryData?.summary.totalCostValuation.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Inversión en almacén
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Valorización a Venta
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${inventoryData?.summary.totalRetailValuation.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Proyección comercial
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Ganancia Proyectada
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${inventoryData?.summary.projectedGrossProfit.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Margen: {inventoryData?.summary.averageMarginPercent || 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">
                  Detalle de Artículos y Márgenes ({filteredInventoryItems.length})
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">SKU</TableHead>
                    <TableHead className="text-xs font-semibold">Producto</TableHead>
                    <TableHead className="text-xs font-semibold">Categoría</TableHead>
                    <TableHead className="text-xs font-semibold">Almacén</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Stock Actual</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Costo Unit.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Costo</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Precio Venta</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Ganancia Est.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInventory ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Calculando valorización de inventario...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                        No se encontraron productos en el inventario.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventoryItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          {item.sku}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.categoryName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.warehouseName}
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {item.currentStock}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${item.averageCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          ${item.totalCostValuation.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          ${item.baseSalePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                          ${item.projectedProfit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                          {item.profitMarginPercent}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: TESORERÍA & FLUJOS */}
        {/* ========================================================================= */}
        <TabsContent value="cashflow" className="space-y-4">
          {/* Controls Bar */}
          <Card className="border-border shadow-xs print:hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Período de Flujo:
                  </span>
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
                      onClick={() => setCashflowDays(p.value)}
                      className="h-8 text-xs"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetchCashflow()}
                  className="h-8 w-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Balances Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {cashflowData?.accountBalances.map((acc) => (
              <Card key={acc.id} className="border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                    {acc.accountName}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {acc.currencyCode}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-foreground">
                    {acc.currentBalance.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                    {acc.currencyCode}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                    {(acc.accountType || acc.type || "Cuenta").toLowerCase().replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Flows by currency */}
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(cashflowData?.flowsByCurrency || {}).map(([currency, flow]) => (
              <Card key={currency} className="border-border shadow-xs p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-xs text-foreground">
                    Flujo Neto ({currency})
                  </span>
                  <Badge
                    variant={flow.net >= 0 ? "secondary" : "destructive"}
                    className="text-[10px]"
                  >
                    {flow.net >= 0 ? "+ Superávit" : "- Déficit"}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Ingresos:
                    </span>
                    <span className="font-semibold text-foreground">
                      +${flow.inflows.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1 text-destructive">
                      <ArrowDownRight className="h-3.5 w-3.5" /> Egresos:
                    </span>
                    <span className="font-semibold text-foreground">
                      -${flow.outflows.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 font-bold text-foreground">
                    <span>Resultado Neto:</span>
                    <span>${flow.net.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent transactions table */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border">
              <span className="font-semibold text-xs text-foreground">
                Movimientos de Tesorería Registrados
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold">Cuenta</TableHead>
                    <TableHead className="text-xs font-semibold">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold">Método</TableHead>
                    <TableHead className="text-xs font-semibold">Referencia</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCashflow ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                        Cargando transacciones...
                      </TableCell>
                    </TableRow>
                  ) : !cashflowData?.recentTransactions || cashflowData.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                        No se registraron movimientos en este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashflowData.recentTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          {new Date(tx.date).toLocaleString("es-VE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {tx.accountName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.flowType === "INFLOW" ? "secondary" : "destructive"}
                            className="text-[9px] px-1 py-0"
                          >
                            {tx.flowType === "INFLOW" ? "INGRESO" : "EGRESO"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.paymentMethodName}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {tx.reference || "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {tx.flowType === "INFLOW" ? "+" : "-"}
                          {tx.amount.toFixed(2)} {tx.currencyCode}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: STREAMING & SUSCRIPCIONES */}
        {/* ========================================================================= */}
        <TabsContent value="subscriptions" className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Suscripciones Activas
                </CardTitle>
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {subscriptionsData?.summary.totalActive || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Clientes al día
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Vencen en 7 Días
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {subscriptionsData?.summary.expiringIn7Days || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Gestión de cobranza inmediata
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Cuentas Maestras
                </CardTitle>
                <Tv className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {subscriptionsData?.capacity.totalMasterAccounts || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Parque activo con proveedores
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Ocupación de Pantallas
                </CardTitle>
                <Percent className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {subscriptionsData?.capacity.occupancyPercent || 0}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {subscriptionsData?.capacity.assignedProfiles || 0} de{" "}
                  {subscriptionsData?.capacity.totalProfiles || 0} perfiles
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming renewals table */}
          <Card className="border-border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">
                  Próximas Renovaciones y Cobranzas Pendientes
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetchSubscriptions()}
                  className="h-7 w-7"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold">Servicio</TableHead>
                    <TableHead className="text-xs font-semibold">Perfil Asignado</TableHead>
                    <TableHead className="text-xs font-semibold">Fecha Vencimiento</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Días Restantes</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Tarifa / Mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSubscriptions ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                        Cargando renovaciones de streaming...
                      </TableCell>
                    </TableRow>
                  ) : !subscriptionsData?.upcomingRenewals || subscriptionsData.upcomingRenewals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                        No hay suscripciones activas pendientes por renovación.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionsData.upcomingRenewals.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-semibold text-foreground">
                          {sub.customerName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {sub.serviceName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.profileIdentifier || "Cuenta Completa"}
                        </TableCell>
                        <TableCell>
                          {new Date(sub.renewAt).toLocaleDateString("es-VE")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              sub.daysRemaining <= 3
                                ? "destructive"
                                : sub.daysRemaining <= 7
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {sub.daysRemaining <= 0
                              ? "Vence Hoy"
                              : `${sub.daysRemaining} días`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ${sub.amount.toFixed(2)} {sub.currencyCode}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
