"use client";

import React, { useRef, useState } from "react";
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
  Clock,
  Loader2,
  Banknote,
  Wallet,
  Euro,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type PresetType =
  | "cash_usd"
  | "cash_ves"
  | "pm_ves"
  | "transfer_ves"
  | "zinli_usd"
  | "binance_usdt"
  | "cash_eur"
  | "credit";

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

  const baseCurrency =
    baseCurrencyProp ||
    currencies.find((c) => c.isBase) ||
    currencies.find((c) => c.code === "USD") ||
    currencies[0] ||
    null;

  const nextIdRef = useRef(1);
  const [appliedRate, setAppliedRate] = useState<number>(
    exchangeRate > 0 ? exchangeRate : 1
  );
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setAppliedRate(exchangeRate > 0 ? exchangeRate : 1);
    setSelectedPreset(null);
    setPayments([]);
    setError(null);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const effectiveRate = appliedRate > 0 ? appliedRate : 1;
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalUSD = Math.max(0, subtotal - globalDiscount);
  const totalBs = Number((totalUSD * effectiveRate).toFixed(2));

  // Helpers para ubicar cuentas y métodos reales
  const findConfig = (preset: Exclude<PresetType, "credit">) => {
    const byMethod = (...keywords: string[]) =>
      paymentMethods.find((m) =>
        keywords.some((k) => m.name.toLowerCase().includes(k))
      ) || paymentMethods[0];

    const byAccount = (currencyCodes: string[], ...keywords: string[]) =>
      financialAccounts.find(
        (a) =>
          (currencyCodes.length === 0 ||
            currencyCodes.includes(a.currency?.code || "")) &&
          keywords.some((k) => a.name.toLowerCase().includes(k))
      ) ||
      financialAccounts.find((a) =>
        currencyCodes.includes(a.currency?.code || "")
      ) ||
      financialAccounts[0];

    switch (preset) {
      case "cash_usd":
        return {
          method: byMethod("efectivo usd", "efectivo $", "efectivo"),
          account: byAccount(["USD"], "caja", "efectivo"),
          currencyCode: "USD",
          amount: totalUSD,
        };
      case "cash_ves":
        return {
          method: byMethod("efectivo bs", "efectivo ves", "efectivo"),
          account: byAccount(["VES"], "caja", "efectivo"),
          currencyCode: "VES",
          amount: totalBs,
        };
      case "pm_ves":
        return {
          method: byMethod("pago móvil", "pago movil", "móvil", "movil"),
          account: byAccount(["VES"], "banesco", "banco", "corriente"),
          currencyCode: "VES",
          amount: totalBs,
        };
      case "transfer_ves":
        return {
          method: byMethod("transferencia"),
          account: byAccount(["VES"], "banesco", "banco", "corriente"),
          currencyCode: "VES",
          amount: totalBs,
        };
      case "zinli_usd":
        return {
          method: byMethod("zinli"),
          account: byAccount(["USD"], "zinli"),
          currencyCode: "USD",
          amount: totalUSD,
        };
      case "binance_usdt":
        return {
          method: byMethod("binance", "usdt"),
          account: byAccount(["USDT", "USD"], "binance"),
          currencyCode: "USDT",
          amount: totalUSD,
        };
      case "cash_eur":
        return {
          method: byMethod("efectivo eur", "euro", "efectivo"),
          account: byAccount(["EUR"], "caja", "euro", "eur"),
          currencyCode: "EUR",
          amount: totalUSD,
        };
    }
  };

  const applyPreset = (preset: PresetType) => {
    setError(null);
    setSelectedPreset(preset);

    if (preset === "credit") {
      setPayments([]);
      return;
    }

    const cfg = findConfig(preset);
    if (!cfg.account || !cfg.method) return;

    setPayments([
      {
        tempId: `pay-${nextIdRef.current++}`,
        financialAccountId: cfg.account.id,
        paymentMethodId: cfg.method.id,
        amount: cfg.amount,
        currencyId: cfg.account.currencyId || baseCurrency?.id || "",
        reference: "",
        accountName: cfg.account.name,
        methodName: cfg.method.name,
        currencyCode: cfg.account.currency?.code || cfg.currencyCode,
      },
    ]);
  };

  // Si cambia la tasa a mano y hay un preset en bolívares activo, actualizar el monto en Bs. automáticamente
  const handleRateChange = (newRate: number) => {
    setAppliedRate(newRate);
    if (
      newRate > 0 &&
      (selectedPreset === "cash_ves" ||
        selectedPreset === "pm_ves" ||
        selectedPreset === "transfer_ves")
    ) {
      const updatedBs = Number((totalUSD * newRate).toFixed(2));
      setPayments((prev) =>
        prev.map((p) => ({
          ...p,
          amount: updatedBs,
        }))
      );
    }
  };

  const totalPaidUSD = payments.reduce((acc, p) => {
    const accObj = financialAccounts.find((a) => a.id === p.financialAccountId);
    const code = accObj?.currency?.code || p.currencyCode || "USD";
    const isBs = code === "VES";
    const amountInUSD = isBs
      ? Number(p.amount || 0) / effectiveRate
      : Number(p.amount || 0);
    return acc + amountInUSD;
  }, 0);

  const pendingBalanceUSD = Math.max(0, totalUSD - totalPaidUSD);
  const changeUSD = Math.max(0, totalPaidUSD - totalUSD);
  const changeBs = (changeUSD * effectiveRate).toFixed(2);

  const handleAddPaymentRow = () => {
    setSelectedPreset(null);
    const defaultAccount = financialAccounts[0];
    const defaultMethod = paymentMethods[0];
    if (!defaultAccount || !defaultMethod) return;

    const isVES = defaultAccount.currency?.code === "VES";
    const suggestedAmount = isVES
      ? Number((pendingBalanceUSD * effectiveRate).toFixed(2))
      : Number(pendingBalanceUSD.toFixed(2));

    setPayments((prev) => [
      ...prev,
      {
        tempId: `pay-${nextIdRef.current++}`,
        financialAccountId: defaultAccount.id,
        paymentMethodId: defaultMethod.id,
        amount: suggestedAmount,
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

  const handleUpdatePayment = (
    tempId: string,
    updates: Partial<PaymentEntry>
  ) => {
    setSelectedPreset(null);
    setPayments((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, ...updates } : p))
    );
  };

  const submitSaleMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      const effectiveCurrencyId = baseCurrency?.id || currencies[0]?.id;
      if (!effectiveCurrencyId) {
        throw new Error(
          "No hay ninguna moneda configurada. Agrega al menos una moneda en Finanzas."
        );
      }

      if (cart.length === 0) {
        throw new Error("El carrito está vacío.");
      }

      let status: "COMPLETED" | "PARTIALLY_PAID" | "PENDING_PAYMENT" =
        "COMPLETED";
      if (payments.length === 0 || totalPaidUSD === 0) {
        status = "PENDING_PAYMENT";
      } else if (pendingBalanceUSD > 0.01) {
        status = "PARTIALLY_PAID";
      }

      const payload = {
        currencyId: effectiveCurrencyId,
        exchangeRateValue: effectiveRate,
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
          const acc = financialAccounts.find(
            (a) => a.id === p.financialAccountId
          );
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

      const res = await api.post<
        { success?: boolean; data?: SaleTransaction } | SaleTransaction
      >("/sales", payload);
      const createdSale =
        res && typeof res === "object" && "data" in res && res.data
          ? (res.data as SaleTransaction)
          : (res as SaleTransaction);
      return createdSale;
    },
    onSuccess: (createdSale) => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      onOpenChange(false);
      onSaleCompleted(createdSale);
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : "Error al registrar la venta."
      );
    },
  });

  const presetButtons: Array<{
    id: PresetType;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    activeClass: string;
  }> = [
    {
      id: "cash_usd",
      label: "Efectivo ($)",
      sublabel: `$${totalUSD.toFixed(2)}`,
      icon: DollarSign,
      accentClass: "text-emerald-600 dark:text-emerald-400",
      activeClass: "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25",
    },
    {
      id: "cash_ves",
      label: "Efectivo (Bs.)",
      sublabel: `Bs. ${totalBs.toFixed(2)}`,
      icon: Banknote,
      accentClass: "text-teal-600 dark:text-teal-400",
      activeClass: "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/25",
    },
    {
      id: "pm_ves",
      label: "Pago Móvil",
      sublabel: `Bs. ${totalBs.toFixed(2)}`,
      icon: Smartphone,
      accentClass: "text-blue-600 dark:text-blue-400",
      activeClass: "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/25",
    },
    {
      id: "transfer_ves",
      label: "Transferencia",
      sublabel: `Bs. ${totalBs.toFixed(2)}`,
      icon: Landmark,
      accentClass: "text-indigo-600 dark:text-indigo-400",
      activeClass: "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/25",
    },
    {
      id: "zinli_usd",
      label: "Zinli",
      sublabel: `$${totalUSD.toFixed(2)}`,
      icon: Wallet,
      accentClass: "text-purple-600 dark:text-purple-400",
      activeClass: "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/25",
    },
    {
      id: "binance_usdt",
      label: "Binance",
      sublabel: `$${totalUSD.toFixed(2)} USDT`,
      icon: ArrowLeftRight,
      accentClass: "text-yellow-600 dark:text-yellow-400",
      activeClass: "border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/25",
    },
    {
      id: "cash_eur",
      label: "Efectivo (€)",
      sublabel: `€${totalUSD.toFixed(2)}`,
      icon: Euro,
      accentClass: "text-sky-600 dark:text-sky-400",
      activeClass: "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/25",
    },
    {
      id: "credit",
      label: "Fiado",
      sublabel: "Paga después",
      icon: Coins,
      accentClass: "text-amber-600 dark:text-amber-400",
      activeClass: "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-card border-border shadow-xl">
        {/* Encabezado fijo */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3.5 pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Cobrar venta
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Elige cómo paga el cliente o divide el pago en varias cuentas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo con un solo scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Total a cobrar + Tasa editable a mano */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Total a cobrar
              </span>
              <div className="text-3xl font-bold font-mono text-foreground mt-0.5">
                ${totalUSD.toFixed(2)}
              </div>
              <div className="text-sm font-mono text-muted-foreground mt-0.5">
                Bs. {totalBs.toFixed(2)}
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <Label
                htmlFor="checkout-rate"
                className="text-xs font-medium text-muted-foreground"
              >
                Tasa usada para esta venta (Bs. por $1)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Bs.</span>
                <Input
                  id="checkout-rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={appliedRate || ""}
                  onChange={(e) =>
                    handleRateChange(Math.max(0.01, Number(e.target.value) || 0))
                  }
                  className="w-28 h-9 text-sm font-mono font-semibold bg-background text-right"
                />
              </div>
            </div>
          </div>

          {/* Botones de pago rápido */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-foreground">
              ¿Cómo paga el cliente?
            </Label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {presetButtons.map((btn) => {
                const Icon = btn.icon;
                const isSelected =
                  btn.id === "credit"
                    ? selectedPreset === "credit" || payments.length === 0
                    : selectedPreset === btn.id;

                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => applyPreset(btn.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 min-h-[78px] select-none cursor-pointer",
                      isSelected
                        ? btn.activeClass
                        : "border-border bg-card hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-sm font-semibold",
                          btn.accentClass
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{btn.label}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2
                          className={cn("h-4 w-4 shrink-0", btn.accentClass)}
                        />
                      )}
                    </div>
                    <div className="font-mono text-xs font-semibold text-foreground truncate">
                      {btn.sublabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle de pagos */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-sm font-semibold text-foreground">
                Detalle del pago ({payments.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPaymentRow}
                className="h-9 px-3 text-sm gap-1.5 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Combinar con otro pago</span>
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Esta venta quedará pendiente por cobrar (fiado)</span>
                </div>
                <p className="text-sm opacity-90">
                  Se guardará a nombre de{" "}
                  <strong>
                    {customer
                      ? `${customer.name} ${customer.lastName || ""}`.trim()
                      : "Cliente general"}
                  </strong>
                  . Podrás registrar abonos después desde el historial.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p, idx) => {
                  const account = financialAccounts.find(
                    (a) => a.id === p.financialAccountId
                  );
                  const currencyCode =
                    account?.currency?.code || p.currencyCode || "USD";
                  const isVES = currencyCode === "VES";
                  const isEUR = currencyCode === "EUR";
                  const symbol = isVES ? "Bs." : isEUR ? "€" : "$";
                  const equivalentText = isVES
                    ? `Equivale a $${(Number(p.amount || 0) / effectiveRate).toFixed(2)} USD`
                    : `Equivale a Bs. ${(Number(p.amount || 0) * effectiveRate).toFixed(2)}`;

                  return (
                    <div
                      key={p.tempId}
                      className="rounded-xl border border-border bg-card p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm">
                          Pago #{idx + 1}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            (
                            {isVES
                              ? "Bolívares"
                              : isEUR
                                ? "Euros"
                                : currencyCode === "USDT"
                                  ? "USDT"
                                  : "Dólares"}
                            )
                          </span>
                        </span>
                        {payments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePaymentRow(p.tempId)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Quitar este pago"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Cuenta donde entra
                          </Label>
                          <select
                            value={p.financialAccountId}
                            onChange={(e) => {
                              const found = financialAccounts.find(
                                (a) => a.id === e.target.value
                              );
                              const nextCode = found?.currency?.code || "USD";
                              const wasVES = currencyCode === "VES";
                              const nowVES = nextCode === "VES";
                              let convertedAmount = p.amount;
                              if (!wasVES && nowVES) {
                                convertedAmount = Number(
                                  (Number(p.amount || 0) * effectiveRate).toFixed(
                                    2
                                  )
                                );
                              } else if (wasVES && !nowVES) {
                                convertedAmount = Number(
                                  (Number(p.amount || 0) / effectiveRate).toFixed(
                                    2
                                  )
                                );
                              }
                              handleUpdatePayment(p.tempId, {
                                financialAccountId: e.target.value,
                                currencyId: found?.currencyId || p.currencyId,
                                currencyCode: nextCode,
                                amount: convertedAmount,
                              });
                            }}
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                          >
                            {financialAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.currency?.code || "USD"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Forma de pago
                          </Label>
                          <select
                            value={p.paymentMethodId}
                            onChange={(e) =>
                              handleUpdatePayment(p.tempId, {
                                paymentMethodId: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Monto recibido ({symbol})
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
                            className="h-10 text-sm font-mono font-semibold"
                          />
                          <p className="text-xs text-muted-foreground font-mono">
                            {equivalentText}
                          </p>
                        </div>
                      </div>

                      <Input
                        placeholder="Número de referencia o nota (opcional)"
                        value={p.reference || ""}
                        onChange={(e) =>
                          handleUpdatePayment(p.tempId, {
                            reference: e.target.value,
                          })
                        }
                        className="h-10 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen de saldo / vuelto */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total recibido (en USD):</span>
              <span className="font-semibold text-foreground font-mono">
                ${totalPaidUSD.toFixed(2)}
              </span>
            </div>

            {pendingBalanceUSD > 0.01 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold border-t border-border/60 pt-2">
                <span>Falta por pagar:</span>
                <span className="font-mono">
                  ${pendingBalanceUSD.toFixed(2)}
                </span>
              </div>
            )}

            {changeUSD > 0.01 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold border-t border-border/60 pt-2">
                <span>Vuelto a entregar:</span>
                <div className="text-right font-mono">
                  <span>${changeUSD.toFixed(2)}</span>
                  {effectiveRate > 1 && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      (Bs. {changeBs})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie fijo */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitSaleMutation.isPending}
            className="h-10 px-5 text-sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => submitSaleMutation.mutate()}
            disabled={submitSaleMutation.isPending}
            className={cn(
              "h-10 px-6 text-sm font-semibold gap-2",
              payments.length === 0 || totalPaidUSD === 0
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : pendingBalanceUSD > 0.01
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {submitSaleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando venta...</span>
              </>
            ) : payments.length === 0 || totalPaidUSD === 0 ? (
              <>
                <Clock className="h-4 w-4" />
                <span>Guardar como fiado (${totalUSD.toFixed(2)})</span>
              </>
            ) : pendingBalanceUSD > 0.01 ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Guardar con abono (${totalPaidUSD.toFixed(2)})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar cobro (${totalPaidUSD.toFixed(2)})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
