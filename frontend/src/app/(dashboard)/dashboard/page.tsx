"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type SaleTransaction,
  type SaleStats,
  type FinancialAccount,
  type ProductCatalogItem,
} from "@/types/pos";
import { type StreamingAccount } from "@/types/streaming";
import { type PaymentTransaction } from "@/types/finance";
import {
  ShoppingCart,
  Package,
  Tv,
  CreditCard,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  DollarSign,
  Landmark,
  Coins,
  CheckCircle2,
  Truck,
  Users,
  BarChart3,
  Layers,
  FileText,
  ArrowDownLeft,
  Store,
  Wallet,
  ShieldCheck,
  Boxes,
  HelpCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Catálogo de Productos e Inventario
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: async () => {
      const res = await api.get<{ data?: ProductCatalogItem[] } | ProductCatalogItem[]>("/products?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  // 2. Métricas Generales de Ventas
  const { data: salesStatsData, isLoading: loadingSalesStats } = useQuery({
    queryKey: ["dashboard-sales-stats"],
    queryFn: () => api.get<SaleStats>("/sales/stats").catch(() => null),
  });

  // 3. Historial de Ventas Recientes
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: async () => {
      const res = await api.get<{ data?: SaleTransaction[]; items?: SaleTransaction[] } | SaleTransaction[]>("/sales?limit=50");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  // 4. Cuentas Financieras & Cajas
  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ["dashboard-financial-accounts"],
    queryFn: async () => {
      const res = await api.get<{ data?: FinancialAccount[] } | FinancialAccount[]>("/financial-accounts");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  // 5. Movimientos / Transacciones de Flujo de Caja
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ["dashboard-transactions"],
    queryFn: async () => {
      const res = await api.get<{ data?: PaymentTransaction[] } | PaymentTransaction[]>("/payment-transactions?limit=10");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  // 6. Cuentas Maestras de Streaming
  const { data: streamingData, isLoading: loadingStreaming } = useQuery({
    queryKey: ["dashboard-streaming"],
    queryFn: async () => {
      const res = await api.get<{ data?: StreamingAccount[] } | StreamingAccount[]>("/streaming-accounts?limit=50");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  // 7. Tasa de Cambio Actual (BCV)
  const { data: exchangeRateData } = useQuery({
    queryKey: ["dashboard-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
      }
    },
  });

  const exchangeRate = typeof exchangeRateData === "number" ? exchangeRateData : 50.0;
  const products = Array.isArray(productsData) ? productsData : [];
  const sales = Array.isArray(salesData) ? salesData : [];
  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const streamingAccounts = Array.isArray(streamingData) ? streamingData : [];
  const stats = salesStatsData || null;

  // Refrescar todos los datos del dashboard
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-sales-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-sales"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-financial-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-streaming"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-exchange-rate"] });
  };

  // Cálculos Consolidados: Finanzas y Bancos
  const totalBankBalanceUSD = useMemo(() => {
    return accounts.reduce((acc, a) => {
      const bal = Number(a.currentBalance || 0);
      const isBs = a.currency?.code === "VES";
      const usdVal = isBs ? bal / (exchangeRate || 1) : bal;
      return acc + usdVal;
    }, 0);
  }, [accounts, exchangeRate]);

  const totalBankBalanceBs = (totalBankBalanceUSD * exchangeRate).toFixed(2);

  // Valoración Monetaria del Inventario
  const totalInventoryValuationUSD = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = p.inventories?.reduce((a, b) => a + Number(b.currentQuantity || 0), 0) ?? 0;
      const price = Number(p.baseSalePrice || 0);
      return acc + stock * price;
    }, 0);
  }, [products]);

  // Alertas de Stock Crítico o Agotado
  const criticalProducts = useMemo(() => {
    return products
      .map((p) => {
        const stock = p.inventories?.reduce(
          (acc, inv) => acc + Number(inv.currentQuantity || 0),
          0
        ) ?? 0;
        const minAlert = Number(p.minStockAlert || 5);
        return {
          ...p,
          totalStock: stock,
          minAlert,
          isCritical: stock <= minAlert,
          isOutOfStock: stock <= 0,
        };
      })
      .filter((p) => p.isCritical)
      .slice(0, 5);
  }, [products]);

  // Alertas de Cuentas Streaming por Vencer (<= 7 días o ya vencidas)
  const expiringStreamingAccounts = useMemo(() => {
    if (!isMounted) return [];
    const now = Date.now();
    return streamingAccounts
      .filter((acc) => {
        if (!acc.supplierCutoffDate) return false;
        const cutoffTime = new Date(acc.supplierCutoffDate).getTime();
        const diffDays = Math.ceil((cutoffTime - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      })
      .map((acc) => {
        const cutoffTime = new Date(acc.supplierCutoffDate).getTime();
        const diffDays = Math.ceil((cutoffTime - now) / (1000 * 60 * 60 * 24));
        return {
          ...acc,
          diffDays,
          isExpired: diffDays < 0,
          isDueToday: diffDays === 0,
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5);
  }, [streamingAccounts, isMounted]);

  // Ocupación de Streaming
  const totalProfilesOccupied = streamingAccounts.reduce((acc, curr) => acc + (curr.occupiedProfiles || 0), 0);
  const totalProfilesCapacity = streamingAccounts.reduce((acc, curr) => acc + (curr.profileCapacity || 0), 0);
  const profilesOccupancyRate = totalProfilesCapacity > 0 ? Math.round((totalProfilesOccupied / totalProfilesCapacity) * 100) : 0;

  // Gráfica de Tendencia de Ventas (Últimos 7 Días)
  const chartDays = useMemo(() => {
    const days: { label: string; dateStr: string; totalUSD: number; count: number }[] = [];
    if (!isMounted) return days;
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = i === 0 ? "Hoy" : d.toLocaleDateString("es-ES", { weekday: "short" });
      const dayNum = d.getDate();
      const dateStr = d.toISOString().split("T")[0];

      const daySales = sales.filter((s) => {
        if (!s.soldAt || s.status === "VOIDED") return false;
        const sDate = new Date(s.soldAt).toISOString().split("T")[0];
        return sDate === dateStr;
      });

      const totalUSD = daySales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      days.push({
        label: `${dayName} ${dayNum}`,
        dateStr,
        totalUSD,
        count: daySales.length,
      });
    }

    return days;
  }, [sales, isMounted]);

  const maxChartValue = Math.max(...chartDays.map((d) => d.totalUSD), 10);
  const weekSalesTotalUSD = chartDays.reduce((acc, d) => acc + d.totalUSD, 0);
  const weekSalesCount = chartDays.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="space-y-8 pb-14">
      {/* 1. Header Ejecutivo & Accesos de Control Primarios */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              ¡Hola, {user?.name || "Administrador"}!
            </h2>
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider hidden sm:inline-flex">
              Panel Administrativo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Centro de mando unificado de CASA ERP. Visión general de economía, inventario, streaming y facturación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {exchangeRate > 1 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-1.5 shadow-2xs font-mono">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tasa BCV
              </span>
              <span className="text-xs font-bold text-foreground">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            title="Sincronizar todos los módulos"
            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Link href="/sales">
            <Button size="sm" className="rounded-xl h-9 px-4 gap-2 text-xs font-bold shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Nueva Venta</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Bloque Financiero y Económico Consolidado (4 KPI Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Facturado */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Ventas Totales
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              ${stats ? Number(stats.totalInvoiced || 0).toFixed(2) : loadingSalesStats ? "..." : "0.00"}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${Number(stats?.salesTodayAmount || 0).toFixed(2)}
              </span>
              <span>hoy ({stats?.salesTodayCount || 0} comprobantes)</span>
            </p>
          </CardContent>
        </Card>

        {/* Liquidez en Bancos y Cajas */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Liquidez Consolidada
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              ${totalBankBalanceUSD.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              Bs. {totalBankBalanceBs} en {accounts.length} cuentas y cajas
            </p>
          </CardContent>
        </Card>

        {/* Cuentas por Cobrar */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Cuentas por Cobrar
            </CardTitle>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              ${stats ? Number(stats.totalPendingBalance || 0).toFixed(2) : "0.00"}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {stats?.pendingSales || 0} ventas a crédito pendientes de cobro
            </p>
          </CardContent>
        </Card>

        {/* Valoración de Inventario */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Valor de Inventario
            </CardTitle>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              ${totalInventoryValuationUSD.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {products.length} productos ({criticalProducts.length} con stock bajo/0)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Gráfica Visual de Ventas (7 Días) + Resumen de Cuentas Bancarias */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Gráfica de Tendencia de Ventas (8 cols en desktop) */}
        <Card className="lg:col-span-8 rounded-xl border border-border/80 shadow-xs bg-card overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Dinámica Semanal de Ventas</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Facturación diaria de los últimos 7 días con volumen en USD
              </CardDescription>
            </div>

            <div className="text-right font-mono">
              <div className="text-sm font-black text-foreground">
                ${weekSalesTotalUSD.toFixed(2)} USD
              </div>
              <p className="text-[10px] text-muted-foreground">
                {weekSalesCount} ventas registradas en la semana
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-6 flex-1 flex flex-col justify-end">
            {/* Visual SVG / HTML Bar Chart */}
            <div className="h-56 w-full flex items-end gap-2 sm:gap-4 justify-between pt-4 pb-2 border-b border-border/80">
              {chartDays.map((day, idx) => {
                const heightPercentage = Math.max(8, Math.round((day.totalUSD / maxChartValue) * 100));
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={day.dateStr}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 rounded-lg bg-foreground text-background text-[10px] px-2.5 py-1 font-mono shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        <span className="font-bold">${day.totalUSD.toFixed(2)}</span> ({day.count} {day.count === 1 ? "venta" : "ventas"})
                      </div>
                    )}

                    {/* Value label over bar */}
                    {day.totalUSD > 0 && (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground mb-1 group-hover:text-primary transition-colors hidden sm:block">
                        ${Math.round(day.totalUSD)}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercentage}%` }}
                      className={cn(
                        "w-full max-w-[42px] rounded-t-lg transition-all duration-200",
                        day.totalUSD > 0
                          ? "bg-gradient-to-t from-primary/70 to-primary group-hover:from-primary group-hover:to-primary/90 shadow-2xs"
                          : "bg-muted/50 group-hover:bg-muted"
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between w-full pt-2 text-[10px] sm:text-xs font-mono text-muted-foreground">
              {chartDays.map((day) => (
                <span key={day.dateStr} className="flex-1 text-center truncate">
                  {day.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Cuentas Bancarias & Cajas (4 cols en desktop) */}
        <Card className="lg:col-span-4 rounded-xl border border-border/80 shadow-xs bg-card flex flex-col justify-between">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span>Cuentas & Cajas</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Saldos disponibles en bancos
              </CardDescription>
            </div>
            <Link href="/finances/accounts">
              <Button variant="ghost" size="xs" className="h-7 text-[11px] gap-1 font-semibold text-primary">
                <span>Gestionar</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5 space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {loadingAccounts ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No hay cuentas bancarias registradas.
              </div>
            ) : (
              accounts.slice(0, 5).map((acc) => {
                const bal = Number(acc.currentBalance || 0);
                const isBs = acc.currency?.code === "VES";
                const usdEquivalent = isBs ? (bal / exchangeRate).toFixed(2) : bal.toFixed(2);

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs shadow-2xs hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 shrink-0">
                        {acc.type === "CASH_REGISTER" ? (
                          <DollarSign className="h-4 w-4" />
                        ) : acc.type === "DIGITAL_WALLET" ? (
                          <Wallet className="h-4 w-4" />
                        ) : (
                          <Landmark className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-foreground truncate">{acc.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {acc.currency?.code || "USD"} • {acc.bankName || "Efectivo"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 pl-2">
                      <div className="font-bold text-foreground text-xs sm:text-sm">
                        {isBs ? `Bs. ${bal.toFixed(2)}` : `$${bal.toFixed(2)}`}
                      </div>
                      {isBs && (
                        <div className="text-[10px] text-muted-foreground">
                          ≈ ${usdEquivalent} USD
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Bloque de Alertas Operativas Críticas: Cuentas Streaming por Vencer + Stock Bajo */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerta de Cuentas Streaming por Vencer */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
                <Tv className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span>Cuentas Streaming por Vencer</span>
                  {expiringStreamingAccounts.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {expiringStreamingAccounts.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Cuentas con fecha de corte de proveedor en los próximos 7 días
                </CardDescription>
              </div>
            </div>
            <Link href="/streaming">
              <Button variant="ghost" size="xs" className="h-7 text-[11px] font-semibold text-primary gap-1">
                <span>Ver todas</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5">
            {loadingStreaming ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : expiringStreamingAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/80 mb-2" />
                <p className="font-semibold text-foreground">Todas las cuentas al día</p>
                <p className="text-muted-foreground mt-0.5">
                  No hay cuentas de streaming próximas a vencer en los siguientes 7 días.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {expiringStreamingAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs shadow-2xs hover:border-border transition-colors gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {acc.service?.name || "Streaming"}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {acc.accessEmail}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono",
                          acc.isExpired
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : acc.isDueToday
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        )}
                      >
                        {acc.isExpired
                          ? "Vencida"
                          : acc.isDueToday
                            ? "Vence Hoy"
                            : `Vence en ${acc.diffDays}d`}
                      </Badge>
                      <Link href="/streaming">
                        <Button size="xs" variant="outline" className="h-7 text-[10px] px-2 rounded-lg">
                          Renovar
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerta de Stock Bajo / Crítico */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <span>Productos con Stock Crítico</span>
                  {criticalProducts.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {criticalProducts.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Artículos por debajo del umbral mínimo de seguridad
                </CardDescription>
              </div>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="xs" className="h-7 text-[11px] font-semibold text-primary gap-1">
                <span>Almacenes</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5">
            {loadingProducts ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                Cargando inventario...
              </div>
            ) : criticalProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/80 mb-2" />
                <p className="font-semibold text-foreground">Inventario en niveles óptimos</p>
                <p className="text-muted-foreground mt-0.5">
                  Ningún producto está por debajo de su stock mínimo de alerta.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-xs shadow-2xs hover:border-border transition-colors gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-foreground truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        SKU: {p.sku} • Alerta: {p.minAlert} un.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border",
                          p.isOutOfStock
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {p.isOutOfStock ? "Agotado" : `${p.totalStock} restantes`}
                      </span>
                      <Link href="/purchases">
                        <Button size="xs" variant="outline" className="h-7 text-[10px] px-2 rounded-lg">
                          Comprar
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Actividad Reciente: Últimas Ventas & Flujo de Movimientos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Últimas Ventas Emitidas */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                <span>Últimas Ventas Emitidas</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Comprobantes recientes procesados en el sistema
              </CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="ghost" size="xs" className="h-7 text-[11px] font-semibold text-primary gap-1">
                <span>Historial</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay ventas recientes registradas.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {sales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold font-mono text-foreground">
                        {sale.documentNumber || sale.orderNumber || sale.id.slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {sale.customer ? `${sale.customer.name} ${sale.customer.lastName || ""}` : "Cliente Mostrador"}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground text-sm">
                        ${Number(sale.total || 0).toFixed(2)}
                      </span>
                      <div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 font-semibold",
                            sale.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : sale.status === "PARTIALLY_PAID"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {sale.status === "COMPLETED" ? "Pagada" : sale.status === "PARTIALLY_PAID" ? "Parcial" : "Por Cobrar"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flujo de Movimientos Financieros */}
        <Card className="rounded-xl border border-border/80 shadow-xs bg-card">
          <CardHeader className="p-5 border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Movimientos de Caja & Bancos</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ingresos y egresos directos de cuentas financieras
              </CardDescription>
            </div>
            <Link href="/finances/transactions">
              <Button variant="ghost" size="xs" className="h-7 text-[11px] font-semibold text-primary gap-1">
                <span>Libro Diario</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hay movimientos de caja registrados hoy.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {transactions.slice(0, 5).map((tx) => {
                  const isInflow = tx.flowType === "INFLOW";
                  const amt = Number(tx.amount || 0);

                  return (
                    <div key={tx.id} className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "rounded-lg p-2 shrink-0",
                            isInflow ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {isInflow ? <TrendingUp className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-semibold text-foreground truncate">
                            {tx.notes || tx.reference || (isInflow ? "Ingreso de Caja" : "Egreso de Fondos")}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {tx.financialAccount?.name || "Cuenta Principal"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 pl-2">
                        <span className={cn("font-bold text-xs sm:text-sm", isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          {isInflow ? "+" : "-"}${amt.toFixed(2)}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          {isMounted && tx.paidAt ? new Date(tx.paidAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Centro de Comando ERP: Módulos Operativos (Reestructuración 100%) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Directorio de Módulos del Sistema
          </h3>
          <p className="text-xs text-muted-foreground">
            Acceso operativo directo a las 12 secciones principales del ERP
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* 1. Ventas */}
          <Link
            href="/sales"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Punto de Venta (POS)
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Emisión rápida multimoneda, caja y tickets
              </p>
            </div>
          </Link>

          {/* 2. Productos */}
          <Link
            href="/products"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {products.length} ítems
              </Badge>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Catálogo de Productos
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Precios, códigos de barras e imágenes
              </p>
            </div>
          </Link>

          {/* 3. Almacenes & Stock */}
          <Link
            href="/inventory"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Boxes className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Almacenes & Stock
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kardex, transferencias y existencias
              </p>
            </div>
          </Link>

          {/* 4. Streaming */}
          <Link
            href="/streaming"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Tv className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {profilesOccupancyRate}% ocupado
              </Badge>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Cuentas Streaming
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cuentas maestras, perfiles y pines
              </p>
            </div>
          </Link>

          {/* 5. Suscripciones */}
          <Link
            href="/subscriptions"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Suscripciones Clientes
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vigencia de perfiles y corte WhatsApp
              </p>
            </div>
          </Link>

          {/* 6. Finanzas & Cuentas */}
          <Link
            href="/finances/accounts"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                <Landmark className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {accounts.length} cuentas
              </Badge>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Finanzas & Bancos
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cuentas bancarias, arqueo y balances
              </p>
            </div>
          </Link>

          {/* 7. Compras a Proveedores */}
          <Link
            href="/purchases"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                <Truck className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Compras de Mercancía
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Órdenes de compra y recepción de stock
              </p>
            </div>
          </Link>

          {/* 8. Clientes */}
          <Link
            href="/customers"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Clientes & Crédito
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Historial, contactos y saldos deudores
              </p>
            </div>
          </Link>

          {/* 9. Proveedores */}
          <Link
            href="/suppliers"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <Store className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Proveedores
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Empresas aliadas y costos pactados
              </p>
            </div>
          </Link>

          {/* 10. Tasas de Cambio */}
          <Link
            href="/finances/exchange-rates"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-green-500/10 p-2.5 text-green-600 dark:text-green-400 group-hover:scale-105 transition-transform">
                <Coins className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-foreground">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Tasas de Cambio
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Historial BCV y conversión cambiaria
              </p>
            </div>
          </Link>

          {/* 11. Reportes & BI */}
          <Link
            href="/reports"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Reportes & Auditoría
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Flujo de caja, exportación CSV y BI
              </p>
            </div>
          </Link>

          {/* 12. Administración & Usuarios */}
          <Link
            href="/admin/users"
            className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-slate-500/10 p-2.5 text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Usuarios & Roles
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control de acceso RBAC y operadores
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
