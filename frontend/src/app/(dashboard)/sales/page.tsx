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
  Clock,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PosCatalog } from "@/components/sales/pos-catalog";
import { PosCart } from "@/components/sales/pos-cart";
import { PosCheckoutDialog } from "@/components/sales/pos-checkout-dialog";
import { SaleReceiptDialog } from "@/components/sales/sale-receipt-dialog";
import { QuickCustomerModal } from "@/components/sales/quick-customer-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { SalesStatsCards } from "@/components/sales/sales-stats-cards";

const emptySubscribe = () => () => {};

function formatPaymentAmount(payment: {
  amount: number | string;
  currency?: { code: string; symbol: string } | null;
  paymentMethod?: { name: string } | null;
  financialAccount?: { name: string } | null;
}): string {
  const num = Number(payment.amount || 0).toFixed(2);
  const code = payment.currency?.code?.toUpperCase();
  if (code === "VES") return `Bs. ${num}`;
  if (code === "EUR") return `€${num}`;
  if (code === "USDT") return `${num} USDT`;
  if (code === "USD") return `$${num}`;
  if (payment.currency?.symbol) return `${payment.currency.symbol} ${num}`;

  const hint = `${payment.paymentMethod?.name || ""} ${payment.financialAccount?.name || ""}`.toLowerCase();
  if (hint.includes("bs") || hint.includes("ves") || hint.includes("móvil") || hint.includes("movil") || hint.includes("transferencia")) {
    return `Bs. ${num}`;
  }
  if (hint.includes("eur") || hint.includes("euro")) return `€${num}`;
  if (hint.includes("binance") || hint.includes("usdt")) return `${num} USDT`;
  return `$${num}`;
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState("pos");
  const [mobilePosView, setMobilePosView] = useState<"catalog" | "cart">(
    "catalog"
  );

  // Estado del carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // Modales
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(
    null
  );
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [metricsSelectedSale, setMetricsSelectedSale] =
    useState<SaleTransaction | null>(null);

  // Consultas
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await api.get<
        { data: ProductCatalogItem[] } | ProductCatalogItem[]
      >("/products?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const res = await api.get<
        { data: ServiceCatalogItem[] } | ServiceCatalogItem[]
      >("/services?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Customer[] } | Customer[]>(
        "/customers?limit=100"
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: currenciesData } = useQuery({
    queryKey: ["currencies-list"],
    queryFn: async () => {
      const res = await api.get<
        { data?: Currency[]; items?: Currency[] } | Currency[]
      >("/currencies");
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
        const res = await api.get<{ data?: Currency } | Currency>(
          "/currencies/base"
        );
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
      const res = await api.get<
        { data?: PaymentMethod[]; items?: PaymentMethod[] } | PaymentMethod[]
      >("/payment-methods?isActive=true");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["financial-accounts-list"],
    queryFn: async () => {
      const res = await api.get<
        { data: FinancialAccount[] } | FinancialAccount[]
      >("/financial-accounts?isActive=true");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>(
          "/exchange-rates/current"
        );
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
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
      const res = await api.get<
        { items: SaleTransaction[] } | SaleTransaction[]
      >("/sales?limit=50");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const {
    data: statsData,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
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
  const paymentMethods = Array.isArray(paymentMethodsData)
    ? paymentMethodsData.filter((m) => m.isActive !== false)
    : [];
  const financialAccounts = Array.isArray(accountsData)
    ? accountsData.filter((a) => a.isActive !== false)
    : [];
  const sales = Array.isArray(salesData) ? salesData : [];
  const exchangeRate =
    typeof exchangeRateData === "number" ? exchangeRateData : 50.0;

  // Ventas de hoy (hidratado en cliente sin hydration mismatch en Next 16)
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const todayDateStr = isClient ? new Date().toDateString() : "";
  const todayFormatted = isClient ? new Date().toLocaleDateString("es-VE") : "";

  const todaysSales = sales.filter((s) => {
    if (!todayDateStr || !s.soldAt) return false;
    return new Date(s.soldAt).toDateString() === todayDateStr;
  });
  const todaysTotalUSD = todaysSales.reduce(
    (acc, s) => (s.status !== "VOIDED" ? acc + Number(s.total || 0) : acc),
    0
  );
  const todaysTotalBs = (todaysTotalUSD * exchangeRate).toFixed(2);

  // Operaciones del carrito
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
          subtotal: Math.max(
            0,
            newQty * existing.unitPrice - existing.discountAmount
          ),
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
    setIsCheckoutOpen(false);
    setCompletedSale(newSale);
    setIsReceiptOpen(true);
    handleClearCart();
    refetchSales();
    refetchStats();
  };

  return (
    <div className="space-y-6 sm:space-y-7 pb-10">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ventas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cobra rápido, revisa tus recibos y lleva el control del día.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {exchangeRate > 1 && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-2xs">
              <span className="text-xs font-medium text-muted-foreground">
                Dólar hoy:
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>
          )}

          <Button
            onClick={() => setActiveTab("pos")}
            className="gap-2 text-sm font-medium h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva venta</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de navegación principal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("pos")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 sm:p-5 transition-all flex items-center justify-between text-left shadow-2xs",
            activeTab === "pos"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <div className="space-y-1 pr-3">
            <h3 className="font-semibold text-base text-foreground">
              Vender ahora
            </h3>
            <p className="text-sm text-muted-foreground">
              Elige productos o servicios y cobra
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors shrink-0",
              activeTab === "pos"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 sm:p-5 transition-all flex items-center justify-between text-left shadow-2xs",
            activeTab === "history"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <div className="space-y-1 pr-3">
            <h3 className="font-semibold text-base text-foreground">
              Historial de ventas
            </h3>
            <p className="text-sm text-muted-foreground">
              {sales.length}{" "}
              {sales.length === 1 ? "venta registrada" : "ventas registradas"}
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors shrink-0",
              activeTab === "history"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Receipt className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("metrics")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 sm:p-5 transition-all flex items-center justify-between text-left shadow-2xs",
            activeTab === "metrics"
              ? "border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40"
              : "border-border bg-card hover:bg-muted/40"
          )}
        >
          <div className="space-y-1 pr-3">
            <h3 className="font-semibold text-base text-foreground">
              Resumen del día
            </h3>
            <p className="text-sm text-muted-foreground">
              Cuánto vendiste y qué falta por cobrar
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 transition-colors shrink-0",
              activeTab === "metrics"
                ? "bg-primary text-primary-foreground dark:bg-white dark:text-zinc-900"
                : "bg-muted text-muted-foreground"
            )}
          >
            <BarChart3 className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Contenido de cada pestaña */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        {/* TAB 1: VENDER AHORA */}
        <TabsContent value="pos" className="m-0 focus-visible:outline-none">
          {/* Selector móvil */}
          <div className="flex lg:hidden items-center justify-between gap-2 p-1.5 bg-muted/60 rounded-xl mb-4 border border-border">
            <button
              type="button"
              onClick={() => setMobilePosView("catalog")}
              className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors ${
                mobilePosView === "catalog"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Productos ({products.length + services.length})
            </button>
            <button
              type="button"
              onClick={() => setMobilePosView("cart")}
              className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                mobilePosView === "cart"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>
                Carrito ({cart.length})
                {cart.length > 0
                  ? ` • $${Math.max(
                      0,
                      cart.reduce((a, b) => a + b.subtotal, 0) - globalDiscount
                    ).toFixed(2)}`
                  : ""}
              </span>
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 h-[calc(100dvh-250px)] min-h-[520px] lg:h-[calc(100vh-240px)] lg:min-h-[640px]">
            <div
              className={`lg:col-span-7 xl:col-span-7 2xl:col-span-8 h-full overflow-hidden flex flex-col ${
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

            <div
              className={`lg:col-span-5 xl:col-span-5 2xl:col-span-4 h-full overflow-hidden flex flex-col ${
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

          {/* Barra flotante en móvil */}
          {cart.length > 0 && mobilePosView === "catalog" && (
            <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden rounded-xl bg-primary p-3.5 text-primary-foreground shadow-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  {cart.reduce((a, b) => a + b.quantity, 0)}{" "}
                  {cart.length === 1 ? "producto" : "productos"} en el carrito
                </span>
                <span className="text-xs opacity-90 font-mono">
                  Total: $
                  {Math.max(
                    0,
                    cart.reduce((a, b) => a + b.subtotal, 0) - globalDiscount
                  ).toFixed(2)}
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => setMobilePosView("cart")}
                className="font-semibold text-sm gap-1.5 h-9"
              >
                <span>Ver carrito</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HISTORIAL DE VENTAS */}
        <TabsContent value="history" className="m-0 focus-visible:outline-none">
          <SalesHistoryTable
            sales={sales}
            isLoading={loadingSales}
            onRefresh={() => {
              refetchSales();
              refetchStats();
            }}
            isFetching={isFetchingSales}
            financialAccounts={financialAccounts}
            paymentMethods={paymentMethods}
            exchangeRate={exchangeRate}
          />
        </TabsContent>

        {/* TAB 3: RESUMEN DEL DÍA */}
        <TabsContent
          value="metrics"
          className="m-0 focus-visible:outline-none space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Resumen de ventas y cobros
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cuánto se ha vendido, cuánto dinero entró y qué queda pendiente.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                refetchSales();
                refetchStats();
              }}
              className="gap-2 text-sm h-10 px-4 self-start sm:self-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualizar</span>
            </Button>
          </div>

          <SalesStatsCards stats={statsData || null} isLoading={loadingStats} />

          {/* Ventas de hoy */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground flex items-center gap-2 flex-wrap">
                    <span>Ventas de hoy</span>
                    {todayFormatted && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({todayFormatted})
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium px-2.5 py-0.5"
                    >
                      {todaysSales.length}{" "}
                      {todaysSales.length === 1 ? "venta" : "ventas"}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Lista de todo lo vendido hoy para revisar tu caja.
                  </p>
                </div>
              </div>

              {todaysSales.length > 0 && (
                <div className="bg-card border border-border px-4 py-2 rounded-xl shadow-2xs flex items-center gap-2 text-sm self-start sm:self-auto">
                  <span className="text-muted-foreground">Total de hoy:</span>
                  <span className="font-bold font-mono text-foreground">
                    ${todaysTotalUSD.toFixed(2)}
                  </span>
                  {exchangeRate > 1 && (
                    <span className="text-muted-foreground text-xs font-mono">
                      (Bs. {todaysTotalBs})
                    </span>
                  )}
                </div>
              )}
            </div>

            {todaysSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center bg-card">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <h4 className="text-base font-semibold text-foreground">
                  Todavía no hay ventas hoy
                </h4>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Cada venta que cobres hoy aparecerá aquí automáticamente para
                  ayudarte a cuadrar la caja al final del día.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/40 border-b border-border">
                        <TableHead className="py-3.5 px-4 text-sm font-semibold">
                          Hora / Recibo
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-sm font-semibold">
                          Cliente
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-sm font-semibold">
                          Cómo pagó
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                          Total
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                          Pagado
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                          Pendiente
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-center text-sm font-semibold">
                          Estado
                        </TableHead>
                        <TableHead className="py-3.5 px-4 text-center text-sm font-semibold">
                          Recibo
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysSales.map((sale) => {
                        const total = Number(sale.total || 0);
                        const totalPaid = Number(
                          sale.totalCollected ?? sale.totalPaid ?? 0
                        );
                        const pending = Math.max(0, total - totalPaid);
                        const totalBs = (total * exchangeRate).toFixed(2);

                        return (
                          <TableRow
                            key={sale.id}
                            className={`hover:bg-muted/30 transition-colors border-b border-border/60 ${
                              sale.status === "VOIDED" ? "opacity-55" : ""
                            }`}
                          >
                            <TableCell className="py-4 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                                  <Receipt className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold font-mono text-sm text-foreground">
                                    {sale.documentNumber ||
                                      sale.orderNumber ||
                                      sale.id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(sale.soldAt).toLocaleTimeString(
                                      [],
                                      { hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4 px-4">
                              <div className="flex flex-col min-w-[140px]">
                                <span className="font-medium text-sm text-foreground">
                                  {sale.customer
                                    ? `${sale.customer.name} ${sale.customer.lastName || ""}`.trim()
                                    : "Cliente general"}
                                </span>
                                {sale.customer?.documentId && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {sale.customer.documentId}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-4 px-4">
                              {sale.payments && sale.payments.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {sale.payments.map((p, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs font-normal px-2.5 py-0.5 font-mono"
                                    >
                                      <span className="font-sans mr-1">
                                        {p.paymentMethod?.name || "Pago"}:
                                      </span>
                                      {formatPaymentAmount(p)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium px-2.5 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                >
                                  Fiado
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-4 px-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-sm text-foreground font-mono">
                                  ${total.toFixed(2)}
                                </span>
                                {exchangeRate > 1 && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    Bs. {totalBs}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-4 px-4 text-right font-semibold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                              ${totalPaid.toFixed(2)}
                            </TableCell>

                            <TableCell className="py-4 px-4 text-right text-sm">
                              {pending > 0.01 ? (
                                <span className="font-semibold text-destructive font-mono bg-destructive/10 px-2 py-0.5 rounded-md">
                                  ${pending.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-mono">
                                  $0.00
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-4 px-4 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
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
                                  ? "Pagada"
                                  : sale.status === "PARTIALLY_PAID"
                                    ? "Abono parcial"
                                    : sale.status === "PENDING_PAYMENT"
                                      ? "Por cobrar"
                                      : "Anulada"}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-4 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMetricsSelectedSale(sale)}
                                title="Ver recibo"
                                className="rounded-lg h-9 w-9 hover:bg-primary/10 hover:text-primary mx-auto"
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

      {/* Modales */}
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

      <QuickCustomerModal
        open={isQuickCustomerOpen}
        onOpenChange={setIsQuickCustomerOpen}
        onCustomerCreated={(newCustomer) => {
          setSelectedCustomer(newCustomer);
        }}
      />

      <SaleReceiptDialog
        sale={completedSale}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        onNewSale={() => {
          setIsReceiptOpen(false);
          setActiveTab("pos");
        }}
        exchangeRate={exchangeRate}
      />

      <SaleReceiptDialog
        sale={metricsSelectedSale}
        open={!!metricsSelectedSale}
        onOpenChange={(open) => !open && setMetricsSelectedSale(null)}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
