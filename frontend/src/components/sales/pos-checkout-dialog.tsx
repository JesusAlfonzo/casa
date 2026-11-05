"use client";

import React, { useState } from "react";
import {
  type CartItem,
  type Customer,
  type FinancialAccount,
  type PaymentMethod,
  type Currency,
  type PaymentEntry,
  type SaleTransaction,
} from "@/types/pos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  CreditCard,
  Plus,
  Trash2,
  DollarSign,
  Smartphone,
  Landmark,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PosCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  customer: Customer | null;
  globalDiscount: number;
  notes: string;
  currencies: Currency[];
  baseCurrencyProp?: Currency | null;
  financialAccounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  exchangeRate?: number;
  onSaleCompleted: (sale: SaleTransaction) => void;
}

type PresetType = "cash_usd" | "pm_ves" | "zelle_usd" | "credit";

export function PosCheckoutDialog({
  open,
  onOpenChange,
  cart,
  customer,
  globalDiscount,
  notes,
  currencies,
  baseCurrencyProp,
  financialAccounts,
  paymentMethods,
  exchangeRate = 1,
  onSaleCompleted,
}: PosCheckoutDialogProps) {
  const queryClient = useQueryClient();

  // Find base currency with robust fallbacks
  const baseCurrency =
    baseCurrencyProp ||
    currencies.find((c) => c.isBase) ||
    currencies.find((c) => c.code === "USD") ||
    currencies[0] ||
    null;

  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalUSD = Math.max(0, subtotal - globalDiscount);
  const totalBs = Number((totalUSD * exchangeRate).toFixed(2));

  // Payments array & Active Preset
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>("cash_usd");
  const [error, setError] = useState<string | null>(null);

  // Helper to find cash account and method
  const findCashConfig = () => {
    const cashMethod =
      paymentMethods.find((m) => m.name.toLowerCase().includes("efectivo") || m.name.toLowerCase().includes("cash")) ||
      paymentMethods[0];
    const cashAccount =
      financialAccounts.find((a) => (a.currency?.code === "USD" || !a.currency) && a.name.toLowerCase().includes("caja")) ||
      financialAccounts.find((a) => a.currency?.code === "USD") ||
      financialAccounts[0];
    return { cashMethod, cashAccount };
  };

  // Helper to find pago movil config
  const findPagoMovilConfig = () => {
    const pmMethod =
      paymentMethods.find(
        (m) =>
          m.name.toLowerCase().includes("móvil") ||
          m.name.toLowerCase().includes("movil") ||
          m.name.toLowerCase().includes("pago movil")
      ) || paymentMethods[0];
    const bankAccount =
      financialAccounts.find(
        (a) =>
          a.currency?.code === "VES" ||
          a.name.toLowerCase().includes("banesco") ||
          a.name.toLowerCase().includes("mercantil") ||
          a.name.toLowerCase().includes("banco")
      ) ||
      financialAccounts.find((a) => a.currency?.code === "VES") ||
      financialAccounts[0];
    return { pmMethod, bankAccount };
  };

  // Helper to find zelle config
  const findZelleConfig = () => {
    const zelleMethod =
      paymentMethods.find((m) => m.name.toLowerCase().includes("zelle")) ||
      paymentMethods.find((m) => m.name.toLowerCase().includes("transferencia")) ||
      paymentMethods[0];
    const zelleAccount =
      financialAccounts.find((a) => a.name.toLowerCase().includes("zelle")) ||
      financialAccounts.find((a) => a.currency?.code === "USD") ||
      financialAccounts[0];
    return { zelleMethod, zelleAccount };
  };

  // Synchronize initial payment state when modal opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setSelectedPreset(null);
    setPayments([]);
    setError(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Total paid calculation
  const totalPaidUSD = payments.reduce((acc, p) => {
    const accObj = financialAccounts.find((a) => a.id === p.financialAccountId);
    const isBs = accObj?.currency?.code === "VES" || p.currencyCode === "VES";
    const amountInUSD = isBs ? (Number(p.amount || 0) / (exchangeRate || 1)) : Number(p.amount || 0);
    return acc + amountInUSD;
  }, 0);

  const pendingBalanceUSD = Math.max(0, totalUSD - totalPaidUSD);
  const changeUSD = Math.max(0, totalPaidUSD - totalUSD);
  const changeBs = (changeUSD * (exchangeRate || 1)).toFixed(2);

  // Quick Preset actions
  const setExactCashUSD = () => {
    setError(null);
    setSelectedPreset("cash_usd");
    const { cashMethod, cashAccount } = findCashConfig();
    if (!cashAccount || !cashMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: cashAccount.id,
        paymentMethodId: cashMethod.id,
        amount: totalUSD,
        currencyId: cashAccount.currencyId || baseCurrency?.id || "",
        reference: "",
        accountName: cashAccount.name,
        methodName: cashMethod.name,
        currencyCode: "USD",
      },
    ]);
  };

  const setExactPagoMovilVES = () => {
    setError(null);
    setSelectedPreset("pm_ves");
    const { pmMethod, bankAccount } = findPagoMovilConfig();
    if (!bankAccount || !pmMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: bankAccount.id,
        paymentMethodId: pmMethod.id,
        amount: totalBs,
        currencyId: bankAccount.currencyId || baseCurrency?.id || "",
        reference: "",
        accountName: bankAccount.name,
        methodName: pmMethod.name,
        currencyCode: "VES",
      },
    ]);
  };

  const setExactZelleUSD = () => {
    setError(null);
    setSelectedPreset("zelle_usd");
    const { zelleMethod, zelleAccount } = findZelleConfig();
    if (!zelleAccount || !zelleMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: zelleAccount.id,
        paymentMethodId: zelleMethod.id,
        amount: totalUSD,
        currencyId: zelleAccount.currencyId || baseCurrency?.id || "",
        reference: "",
        accountName: zelleAccount.name,
        methodName: zelleMethod.name,
        currencyCode: "USD",
      },
    ]);
  };

  const setCreditSale = () => {
    setError(null);
    setSelectedPreset("credit");
    setPayments([]);
  };

  const handleAddPaymentRow = () => {
    setSelectedPreset(null);
    const defaultAccount = financialAccounts[0];
    const defaultMethod = paymentMethods[0];
    if (!defaultAccount || !defaultMethod) return;

    setPayments((prev) => [
      ...prev,
      {
        tempId: `pay-${Date.now()}-${Math.random()}`,
        financialAccountId: defaultAccount.id,
        paymentMethodId: defaultMethod.id,
        amount: Number(pendingBalanceUSD.toFixed(2)),
        currencyId: defaultAccount.currencyId || baseCurrency?.id || "",
        reference: "",
        accountName: defaultAccount.name,
        methodName: defaultMethod.name,
        currencyCode: defaultAccount.currency?.code || "USD",
      },
    ]);
  };

  const handleRemovePaymentRow = (tempId: string) => {
    setSelectedPreset(null);
    setPayments((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleUpdatePayment = (tempId: string, updates: Partial<PaymentEntry>) => {
    setSelectedPreset(null);
    setPayments((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, ...updates } : p))
    );
  };

  // Submit sale mutation
  const submitSaleMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      const effectiveCurrencyId = baseCurrency?.id || currencies[0]?.id;
      if (!effectiveCurrencyId) {
        throw new Error(
          "No se ha configurado la moneda base del sistema. Por favor registra o activa al menos una moneda en el módulo de Finanzas."
        );
      }

      if (cart.length === 0) {
        throw new Error("El carrito no tiene artículos para procesar.");
      }

      // Determine status
      let status: "COMPLETED" | "PARTIALLY_PAID" | "PENDING_PAYMENT" = "COMPLETED";
      if (payments.length === 0 || totalPaidUSD === 0) {
        status = "PENDING_PAYMENT";
      } else if (pendingBalanceUSD > 0.01) {
        status = "PARTIALLY_PAID";
      }

      const payload = {
        currencyId: effectiveCurrencyId,
        exchangeRateValue: exchangeRate,
        customerId: customer?.id || null,
        discountAmount: globalDiscount,
        notes: notes || undefined,
        status,
        items: cart.map((item) => ({
          itemType: item.itemType,
          productId: item.productId || null,
          serviceId: item.serviceId || null,
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxPercentage: item.taxPercentage,
        })),
        payments: payments.map((p) => {
          const acc = financialAccounts.find((a) => a.id === p.financialAccountId);
          return {
            financialAccountId: p.financialAccountId,
            paymentMethodId: p.paymentMethodId,
            amount: p.amount,
            currencyId: p.currencyId || acc?.currencyId || effectiveCurrencyId,
            reference: p.reference || undefined,
            notes: p.notes || undefined,
          };
        }),
      };

      const res = await api.post<{ success?: boolean; data?: SaleTransaction } | SaleTransaction>("/sales", payload);
      const createdSale =
        res && typeof res === "object" && "data" in res && res.data
          ? (res.data as SaleTransaction)
          : (res as SaleTransaction);
      return createdSale;
    },
    onSuccess: (createdSale) => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      onSaleCompleted(createdSale);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Error al registrar la venta.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border-border shadow-xl">
        {/* Header (Pinned) */}
        <DialogHeader className="shrink-0 p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex items-center gap-3 text-primary">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Procesar Cobro & Registro de Venta
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Selecciona un atajo de cobro rápido con un solo clic o combina múltiples cuentas y métodos (pago dividido).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Quick Presets Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Atajos de Pago Rápido (1 Clic):</span>
              </Label>
              {selectedPreset && (
                <span className="text-[11px] font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  Atajo activo
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={setExactCashUSD}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-[72px] select-none cursor-pointer",
                  selectedPreset === "cash_usd"
                    ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-border/80 bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                    <span>Efectivo USD</span>
                  </div>
                  {selectedPreset === "cash_usd" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="font-mono text-sm font-bold text-foreground">
                  ${totalUSD.toFixed(2)}
                </div>
              </button>

              <button
                type="button"
                onClick={setExactPagoMovilVES}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-[72px] select-none cursor-pointer",
                  selectedPreset === "pm_ves"
                    ? "border-blue-500 bg-blue-500/10 text-foreground ring-2 ring-blue-500/30 shadow-xs"
                    : "border-border/80 bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Smartphone className="h-4 w-4" />
                    <span>Pago Móvil</span>
                  </div>
                  {selectedPreset === "pm_ves" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="font-mono text-sm font-bold text-foreground truncate">
                  Bs. {totalBs.toFixed(2)}
                </div>
              </button>

              <button
                type="button"
                onClick={setExactZelleUSD}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-[72px] select-none cursor-pointer",
                  selectedPreset === "zelle_usd"
                    ? "border-purple-500 bg-purple-500/10 text-foreground ring-2 ring-purple-500/30 shadow-xs"
                    : "border-border/80 bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                    <Landmark className="h-4 w-4" />
                    <span>Zelle USD</span>
                  </div>
                  {selectedPreset === "zelle_usd" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="font-mono text-sm font-bold text-foreground">
                  ${totalUSD.toFixed(2)}
                </div>
              </button>

              <button
                type="button"
                onClick={setCreditSale}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-[72px] select-none cursor-pointer",
                  selectedPreset === "credit" || payments.length === 0
                    ? "border-amber-500 bg-amber-500/10 text-foreground ring-2 ring-amber-500/30 shadow-xs"
                    : "border-border/80 bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span>A Crédito / Por Cobrar</span>
                  </div>
                  {(selectedPreset === "credit" || payments.length === 0) && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  Sin abono (Por Cobrar)
                </div>
              </button>
            </div>
          </div>

          {/* Overview Box */}
          <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Facturado (USD):
              </span>
              <div className="text-2xl font-black font-mono text-foreground">
                ${totalUSD.toFixed(2)}
              </div>
            </div>

            {exchangeRate > 1 && (
              <div className="sm:text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Equivalente Oficial (VES):
                </span>
                <div className="text-base sm:text-lg font-bold font-mono text-foreground">
                  Bs. {totalBs.toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  (Tasa BCV: {exchangeRate.toFixed(2)} Bs/$)
                </span>
              </div>
            )}
          </div>

          {/* Payments Desglose List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Líneas de Pago & Abonos ({payments.length}):
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleAddPaymentRow}
                className="text-[11px] text-primary gap-1 h-7 hover:bg-primary/10 font-semibold"
              >
                <Plus className="h-3 w-3" />
                <span>+ Agregar Otra Cuenta / Moneda</span>
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-300">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Venta sin abono inicial (100% a Crédito)</span>
                </div>
                <p className="text-[11px] mt-1 opacity-90">
                  La orden se registrará con estatus <strong>PENDIENTE DE PAGO</strong> asociada a {customer ? `${customer.name} ${customer.lastName || ""}` : "Cliente Mostrador"}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p, idx) => {
                  const account = financialAccounts.find((a) => a.id === p.financialAccountId);
                  const isVES = account?.currency?.code === "VES" || p.currencyCode === "VES";

                  return (
                    <div
                      key={p.tempId}
                      className="rounded-xl border border-border bg-card p-3 space-y-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <span>Abono #{idx + 1}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ({isVES ? "Bolívares VES" : "Dólares USD"})
                          </span>
                        </span>
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentRow(p.tempId)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            title="Eliminar este abono"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Financial Account */}
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            Cuenta Destino
                          </Label>
                          <select
                            value={p.financialAccountId}
                            onChange={(e) => {
                              const found = financialAccounts.find((a) => a.id === e.target.value);
                              handleUpdatePayment(p.tempId, {
                                financialAccountId: e.target.value,
                                currencyId: found?.currencyId || p.currencyId,
                                currencyCode: found?.currency?.code,
                              });
                            }}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {financialAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.currency?.code || "USD"})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Payment Method */}
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            Método de Pago
                          </Label>
                          <select
                            value={p.paymentMethodId}
                            onChange={(e) => handleUpdatePayment(p.tempId, { paymentMethodId: e.target.value })}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount */}
                        <div>
                          <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                            Monto Recibido ({isVES ? "Bs" : "$"})
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={p.amount || ""}
                            onChange={(e) =>
                              handleUpdatePayment(p.tempId, {
                                amount: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-xs font-mono font-bold rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Reference Number */}
                      <div>
                        <Input
                          placeholder="Referencia bancaria o código de confirmación (Opcional)..."
                          value={p.reference || ""}
                          onChange={(e) => handleUpdatePayment(p.tempId, { reference: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Balance Calculation Box */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground font-medium">
              <span>Total Abonado (Equivalente USD):</span>
              <span className="font-bold text-foreground font-mono">
                ${totalPaidUSD.toFixed(2)}
              </span>
            </div>

            {pendingBalanceUSD > 0.01 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-border/60 pt-1.5">
                <span>Saldo Pendiente por Cobrar:</span>
                <span className="font-mono">${pendingBalanceUSD.toFixed(2)}</span>
              </div>
            )}

            {changeUSD > 0.01 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold border-t border-border/60 pt-1.5">
                <span>Vuelto / Cambio a Entregar:</span>
                <div className="text-right">
                  <span className="font-mono">${changeUSD.toFixed(2)} USD</span>
                  {exchangeRate > 1 && (
                    <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                      (Bs. {changeBs})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Anchored Footer (Permanently Visible with generous margins) */}
        <DialogFooter className="m-0 mx-0 mb-0 shrink-0 px-6 py-4 border-t border-border bg-card flex sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => submitSaleMutation.mutate()}
            disabled={submitSaleMutation.isPending}
            className={cn(
              "h-10 px-6 rounded-xl font-bold text-xs gap-2 shadow-sm transition-all",
              payments.length === 0 || totalPaidUSD === 0
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : pendingBalanceUSD > 0.01
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {submitSaleMutation.isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Registrando Venta...</span>
              </>
            ) : payments.length === 0 || totalPaidUSD === 0 ? (
              <>
                <Clock className="h-4 w-4" />
                <span>Registrar Venta Por Cobrar (${totalUSD.toFixed(2)})</span>
              </>
            ) : pendingBalanceUSD > 0.01 ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Confirmar Venta (Abono Parcial: ${totalPaidUSD.toFixed(2)})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar Venta y Cobro (${totalPaidUSD.toFixed(2)})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
