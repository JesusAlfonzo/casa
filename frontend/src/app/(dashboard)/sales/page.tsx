"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type CartItem,
  type Customer,
  type Currency,
  type FinancialAccount,
  type PaymentMethod,
  type ProductCatalogItem,
  type ServiceCatalogItem,
  type SaleTransaction,
  type SaleStats,
} from "@/types/pos";
import {
  ShoppingCart,
  Receipt,
  BarChart3,
  RefreshCw,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PosCatalog } from "@/components/sales/pos-catalog";
import { PosCart } from "@/components/sales/pos-cart";
import { PosCheckoutDialog } from "@/components/sales/pos-checkout-dialog";
import { SaleReceiptDialog } from "@/components/sales/sale-receipt-dialog";
import { QuickCustomerModal } from "@/components/sales/quick-customer-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { SalesStatsCards } from "@/components/sales/sales-stats-cards";

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState("pos");
  const [mobilePosView, setMobilePosView] = useState<"catalog" | "cart">("catalog");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [metricsSelectedSale, setMetricsSelectedSale] = useState<SaleTransaction | null>(null);

  // Queries
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await api.get<{ data: ProductCatalogItem[] } | ProductCatalogItem[]>("/products?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const res = await api.get<{ data: ServiceCatalogItem[] } | ServiceCatalogItem[]>("/services?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Customer[] } | Customer[]>("/customers?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: currenciesData } = useQuery({
    queryKey: ["currencies-list"],
    queryFn: async () => {
      const res = await api.get<{ data?: Currency[]; items?: Currency[] } | Currency[]>("/currencies");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: baseCurrencyData } = useQuery({
    queryKey: ["base-currency"],
    queryFn: async () => {
      try {
        const res = await api.get<{ data?: Currency } | Currency>("/currencies/base");
        if (res && "data" in res && res.data) return res.data;
        return res as Currency;
      } catch {
        return null;
      }
    },
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods-list"],
    queryFn: async () => {
      const res = await api.get<{ data?: PaymentMethod[]; items?: PaymentMethod[] } | PaymentMethod[]>("/payment-methods");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["financial-accounts-list"],
    queryFn: async () => {
      const res = await api.get<{ data: FinancialAccount[] } | FinancialAccount[]>("/financial-accounts");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
        return Number(res?.rate || 1);
      } catch {
        return 50.0; // Fallback rate
      }
    },
  });

  const {
    data: salesData,
    isLoading: loadingSales,
    refetch: refetchSales,
    isFetching: isFetchingSales,
  } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => {
      const res = await api.get<{ items: SaleTransaction[] } | SaleTransaction[]>("/sales?limit=50");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["sales-stats"],
    queryFn: () => api.get<SaleStats>("/sales/stats").catch(() => null),
  });

  const products = Array.isArray(productsData) ? productsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];
  const customers = Array.isArray(customersData) ? customersData : [];
  const currencies = Array.isArray(currenciesData) ? currenciesData : [];
  const baseCurrency =
    baseCurrencyData ||
    currencies.find((c) => c.isBase) ||
    currencies.find((c) => c.code === "USD") ||
    currencies[0] ||
    null;
  const paymentMethods = Array.isArray(paymentMethodsData) ? paymentMethodsData : [];
  const financialAccounts = Array.isArray(accountsData) ? accountsData : [];
  const sales = Array.isArray(salesData) ? salesData : [];
  const exchangeRate = typeof exchangeRateData === "number" ? exchangeRateData : 50.0;

  // Filter sales for today (hydrated on client to avoid Next.js 16 prerender errors)
  const [todayDateStr, setTodayDateStr] = useState<string>("");
  const [todayFormatted, setTodayFormatted] = useState<string>("");

  React.useEffect(() => {
    const now = new Date();
    setTodayDateStr(now.toDateString());
    setTodayFormatted(now.toLocaleDateString());
  }, []);

  const todaysSales = sales.filter((s) => {
    if (!todayDateStr || !s.soldAt) return false;
    return new Date(s.soldAt).toDateString() === todayDateStr;
  });
  const todaysTotalUSD = todaysSales.reduce((acc, s) => (s.status !== "VOIDED" ? acc + Number(s.total || 0) : acc), 0);
  const todaysTotalBs = (todaysTotalUSD * exchangeRate).toFixed(2);

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((it) => it.tempId === item.tempId);
      if (existingIndex >= 0) {
        const next = [...prev];
        const existing = next[existingIndex];
        const newQty = existing.quantity + 1;
        next[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: Math.max(0, newQty * existing.unitPrice - existing.discountAmount),
        };
        return next;
      }
      return [...prev, item];
    });
  };

  const handleUpdateQuantity = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.tempId === tempId) {
            const newQty = it.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...it,
              quantity: newQty,
              subtotal: Math.max(0, newQty * it.unitPrice - it.discountAmount),
            };
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetQuantity = (tempId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((it) => {
        if (it.tempId === tempId) {
          const validQty = Math.max(1, quantity);
          return {
            ...it,
            quantity: validQty,
            subtotal: Math.max(0, validQty * it.unitPrice - it.discountAmount),
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setCart((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setGlobalDiscount(0);
    setNotes("");
  };

  const handleSaleCompleted = (newSale: SaleTransaction) => {
    setCompletedSale(newSale);
    setIsReceiptOpen(true);
    handleClearCart();
    refetchSales();
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Punto de Venta & Facturación
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Emisión ágil de comprobantes, control de caja multimoneda (USD / Bs), inventario en tiempo real y servicios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {exchangeRate > 1 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tasa BCV
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setActiveTab("pos")}
            className="gap-2 text-xs shadow-xs font-semibold h-9"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Venta</span>
          </Button>
        </div>
      </div>

      {/* Main Selection Cards Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => setActiveTab("pos")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between shadow-xs",
            activeTab === "pos"
              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border bg-card hover:bg-accent/40 text-muted-foreground"
          )}
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              Caja & Emisión
            </p>
            <h3 className="font-bold text-base text-foreground">
              Punto de Venta (POS)
            </h3>
            <p className="text-xs text-muted-foreground">
              Catálogo visual y cobro rápido
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors",
              activeTab === "pos"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900 shadow-xs"
                : "bg-muted/80 text-muted-foreground"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("history")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between shadow-xs",
            activeTab === "history"
              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border bg-card hover:bg-accent/40 text-muted-foreground"
          )}
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              Comprobantes
            </p>
            <h3 className="font-bold text-base text-foreground">
              Historial de Ventas
            </h3>
            <p className="text-xs text-muted-foreground">
              {sales.length} comprobantes registrados
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors",
              activeTab === "history"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900 shadow-xs"
                : "bg-muted/80 text-muted-foreground"
            )}
          >
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("metrics")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between shadow-xs",
            activeTab === "metrics"
              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border bg-card hover:bg-accent/40 text-muted-foreground"
          )}
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              Finanzas & Cierre
            </p>
            <h3 className="font-bold text-base text-foreground">
              Caja & Métricas
            </h3>
            <p className="text-xs text-muted-foreground">
              Balance recaudado y cuentas por cobrar
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors",
              activeTab === "metrics"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900 shadow-xs"
                : "bg-muted/80 text-muted-foreground"
            )}
          >
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        {/* TAB 1: POS / CAJA */}
        <TabsContent value="pos" className="m-0 focus-visible:outline-none">
          {/* Mobile View Selector (< lg) */}
          <div className="flex lg:hidden items-center justify-between gap-2 p-1.5 bg-muted/60 rounded-xl mb-4 border border-border/60">
            <button
              type="button"
              onClick={() => setMobilePosView("catalog")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                mobilePosView === "catalog"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Catálogo ({products.length + services.length})
            </button>
            <button
              type="button"
              onClick={() => setMobilePosView("cart")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mobilePosView === "cart"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>
                Carrito ({cart.length}){cart.length > 0 ? ` • $${Math.max(0, cart.reduce((a, b) => a + b.subtotal, 0) - globalDiscount).toFixed(2)}` : ""}
              </span>
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 h-[calc(100dvh-250px)] min-h-[500px] lg:h-[calc(100vh-240px)] lg:min-h-[640px]">
            {/* Catalog Grid (Left 7-8 cols on desktop, 9 cols on 2xl, full on mobile when catalog selected) */}
            <div
              className={`lg:col-span-7 xl:col-span-8 2xl:col-span-9 h-full overflow-hidden flex flex-col ${
                mobilePosView === "catalog" ? "flex" : "hidden lg:flex"
              }`}
            >
              <PosCatalog
                products={products}
                services={services}
                cart={cart}
                onAddToCart={handleAddToCart}
                exchangeRate={exchangeRate}
                isLoading={loadingProducts || loadingServices}
              />
            </div>

            {/* Cart & Checkout Panel (Right 5 cols on lg, 4 cols on xl, 3 cols on 2xl) */}
            <div
              className={`lg:col-span-5 xl:col-span-4 2xl:col-span-3 h-full overflow-hidden flex flex-col ${
                mobilePosView === "cart" ? "flex" : "hidden lg:flex"
              }`}
            >
              <PosCart
                cart={cart}
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                onOpenQuickCustomer={() => setIsQuickCustomerOpen(true)}
                onUpdateQuantity={handleUpdateQuantity}
                onSetQuantity={handleSetQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onCheckout={() => setIsCheckoutOpen(true)}
                globalDiscount={globalDiscount}
                onSetGlobalDiscount={setGlobalDiscount}
                notes={notes}
                onSetNotes={setNotes}
                exchangeRate={exchangeRate}
              />
            </div>
          </div>

          {/* Sticky Mobile Floating Cart Bar (< lg) */}
          {cart.length > 0 && mobilePosView === "catalog" && (
            <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden rounded-xl bg-primary p-3 text-primary-foreground shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex flex-col">
                <span className="font-bold text-xs">
                  {cart.reduce((a, b) => a + b.quantity, 0)} {cart.length === 1 ? "artículo" : "artículos"} en carrito
                </span>
                <span className="text-[11px] opacity-90 font-mono">
                  Total: ${Math.max(0, cart.reduce((a, b) => a + b.subtotal, 0) - globalDiscount).toFixed(2)} USD
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMobilePosView("cart")}
                className="font-bold text-xs gap-1.5 shadow-sm h-8"
              >
                <span>Ver Carrito</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HISTORIAL DE VENTAS */}
        <TabsContent value="history" className="m-0 focus-visible:outline-none">
          <SalesHistoryTable
            sales={sales}
            isLoading={loadingSales}
            onRefresh={refetchSales}
            isFetching={isFetchingSales}
            financialAccounts={financialAccounts}
            paymentMethods={paymentMethods}
            exchangeRate={exchangeRate}
          />
        </TabsContent>

        {/* TAB 3: MÉTRICAS Y REPORTES */}
        <TabsContent value="metrics" className="m-0 focus-visible:outline-none space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Balance General & Arqueo del Día
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Resumen consolidado de ingresos, recaudación y desglose de comprobantes emitidos hoy.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSales()}
              className="gap-2 text-xs font-semibold rounded-xl h-8.5 px-3.5 shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualizar Métricas</span>
            </Button>
          </div>

          <SalesStatsCards stats={statsData || null} isLoading={loadingStats} />

          {/* Today's Sales Table */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <span>Comprobantes Emitidos Hoy</span>
                    {todayFormatted && (
                      <span className="text-xs font-normal text-muted-foreground font-mono">
                        ({todayFormatted})
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Registro de comprobantes procesados en el punto de venta para el cuadre diario.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono font-bold px-2.5 py-0.5 bg-primary/5 border-primary/20 text-primary ml-1"
                >
                  {todaysSales.length} {todaysSales.length === 1 ? "venta" : "ventas"}
                </Badge>
              </div>

              {todaysSales.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <div className="bg-card border border-border px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                    <span className="text-muted-foreground font-sans text-xs">Total Facturado:</span>
                    <span className="font-bold text-foreground">
                      ${todaysTotalUSD.toFixed(2)} USD
                    </span>
                    {exchangeRate > 1 && (
                      <span className="text-muted-foreground text-[11px]">
                        (Bs. {todaysTotalBs})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {todaysSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center bg-card">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <h5 className="text-sm font-semibold text-foreground">
                  No se han registrado ventas el día de hoy
                </h5>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Las ventas que proceses hoy desde el Punto de Venta se registrarán y listarán automáticamente aquí para el cuadre de caja diario.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/40 border-b border-border/80">
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-foreground min-w-[150px]">
                          Hora / Comprobante
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-foreground min-w-[170px]">
                          Cliente
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-xs font-bold text-foreground min-w-[200px]">
                          Detalle de Cobro
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-xs font-bold text-foreground min-w-[120px]">
                          Total USD
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-xs font-bold text-foreground min-w-[110px]">
                          Pagado
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-xs font-bold text-foreground min-w-[110px]">
                          Saldo
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-center text-xs font-bold text-foreground min-w-[120px]">
                          Estado
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-center text-xs font-bold text-foreground min-w-[80px]">
                          Ticket
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysSales.map((sale) => {
                        const total = Number(sale.total || 0);
                        const totalPaid = Number(sale.totalCollected ?? sale.totalPaid ?? 0);
                        const pending = Math.max(0, total - totalPaid);
                        const totalBs = (total * exchangeRate).toFixed(2);

                        return (
                          <TableRow
                            key={sale.id}
                            className={`hover:bg-muted/30 transition-colors border-b border-border/60 ${
                              sale.status === "VOIDED" ? "opacity-50" : ""
                            }`}
                          >
                            {/* Hora / Comprobante */}
                            <TableCell className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                                  <Receipt className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold font-mono text-xs text-foreground tracking-tight">
                                    {sale.documentNumber || sale.orderNumber || sale.id.slice(0, 8)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Cliente */}
                            <TableCell className="py-3.5 px-4">
                              <div className="flex flex-col min-w-[150px]">
                                <span className="font-semibold text-xs text-foreground">
                                  {sale.customer
                                    ? `${sale.customer.name} ${sale.customer.lastName || ""}`
                                    : "Cliente Mostrador"}
                                </span>
                                {sale.customer?.documentId ? (
                                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    CI/RIF: {sale.customer.documentId}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                    Consumidor Final
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Detalle de Cobro */}
                            <TableCell className="py-3.5 px-4">
                              {sale.payments && sale.payments.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {sale.payments.map((p, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-[10px] font-mono px-2 py-0.5 bg-muted/50 border-border/80 font-medium"
                                    >
                                      {p.paymentMethod?.name || "Pago"}: ${Number(p.amount || 0).toFixed(2)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                >
                                  Sin abono (A Crédito)
                                </Badge>
                              )}
                            </TableCell>

                            {/* Total Facturado */}
                            <TableCell className="py-3.5 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-xs text-foreground font-mono">
                                  ${total.toFixed(2)}
                                </span>
                                {exchangeRate > 1 && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Bs. {totalBs}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Total Pagado */}
                            <TableCell className="py-3.5 px-4 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                              ${totalPaid.toFixed(2)}
                            </TableCell>

                            {/* Saldo Pendiente */}
                            <TableCell className="py-3.5 px-4 text-right text-xs">
                              {pending > 0.01 ? (
                                <span className="font-bold text-destructive font-mono bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-md">
                                  ${pending.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-mono font-medium">$0.00</span>
                              )}
                            </TableCell>

                            {/* Estado */}
                            <TableCell className="py-3.5 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                                  sale.status === "COMPLETED"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : sale.status === "PARTIALLY_PAID"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : sale.status === "PENDING_PAYMENT"
                                        ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "border-destructive/30 bg-destructive/10 text-destructive"
                                }`}
                              >
                                {sale.status === "COMPLETED"
                                  ? "PAGADA"
                                  : sale.status === "PARTIALLY_PAID"
                                    ? "PAGO PARCIAL"
                                    : sale.status === "PENDING_PAYMENT"
                                      ? "POR COBRAR"
                                      : "ANULADA"}
                              </Badge>
                            </TableCell>

                            {/* Ticket Acción */}
                            <TableCell className="py-3.5 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setMetricsSelectedSale(sale)}
                                title="Ver Comprobante"
                                className="rounded-lg h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors mx-auto"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      <PosCheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
        customer={selectedCustomer}
        globalDiscount={globalDiscount}
        notes={notes}
        currencies={currencies}
        baseCurrencyProp={baseCurrency}
        financialAccounts={financialAccounts}
        paymentMethods={paymentMethods}
        exchangeRate={exchangeRate}
        onSaleCompleted={handleSaleCompleted}
      />

      {/* Quick Customer Dialog */}
      <QuickCustomerModal
        open={isQuickCustomerOpen}
        onOpenChange={setIsQuickCustomerOpen}
        onCustomerCreated={(newCust) => setSelectedCustomer(newCust)}
      />

      {/* Printable Receipt & WhatsApp Dialog */}
      <SaleReceiptDialog
        sale={completedSale}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        onNewSale={handleClearCart}
        exchangeRate={exchangeRate}
      />

      {/* Receipt Dialog from Metrics today's sales */}
      <SaleReceiptDialog
        sale={metricsSelectedSale}
        open={!!metricsSelectedSale}
        onOpenChange={(open) => !open && setMetricsSelectedSale(null)}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
