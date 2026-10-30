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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    queryFn: () => api.get<Currency[]>("/currencies").catch(() => []),
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods-list"],
    queryFn: () => api.get<PaymentMethod[]>("/payment-methods").catch(() => []),
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
  const paymentMethods = Array.isArray(paymentMethodsData) ? paymentMethodsData : [];
  const financialAccounts = Array.isArray(accountsData) ? accountsData : [];
  const sales = Array.isArray(salesData) ? salesData : [];
  const exchangeRate = typeof exchangeRateData === "number" ? exchangeRateData : 50.0;

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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Punto de Venta & Facturación
          </h2>
          <p className="text-xs text-muted-foreground">
            Emisión de comprobantes, control de caja multimoneda (USD / Bs), inventario y suscripciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {exchangeRate > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono">
              <span className="text-muted-foreground">Tasa BCV/Día:</span>
              <strong className="text-foreground">Bs. {exchangeRate.toFixed(2)}</strong>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setActiveTab("pos")}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Venta (POS)</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md h-9 p-1">
          <TabsTrigger value="pos" className="gap-1.5 text-xs">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Punto de Venta</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" />
            <span>Historial ({sales.length})</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Caja & Métricas</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: POS / CAJA */}
        <TabsContent value="pos" className="m-0 focus-visible:outline-none">
          <div className="grid gap-4 lg:grid-cols-12 h-[calc(100vh-210px)] min-h-[580px]">
            {/* Catalog Grid (Left 7 cols) */}
            <div className="lg:col-span-7 h-full overflow-hidden flex flex-col">
              <PosCatalog
                products={products}
                services={services}
                cart={cart}
                onAddToCart={handleAddToCart}
                exchangeRate={exchangeRate}
                isLoading={loadingProducts || loadingServices}
              />
            </div>

            {/* Cart & Checkout Panel (Right 5 cols) */}
            <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
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
        <TabsContent value="metrics" className="m-0 focus-visible:outline-none space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              Balance General de Facturación
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSales()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualizar Métricas</span>
            </Button>
          </div>

          <SalesStatsCards stats={statsData || null} isLoading={loadingStats} />
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
    </div>
  );
}
