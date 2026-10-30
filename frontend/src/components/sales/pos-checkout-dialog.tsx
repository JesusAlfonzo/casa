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

interface PosCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  customer: Customer | null;
  globalDiscount: number;
  notes: string;
  currencies: Currency[];
  financialAccounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  exchangeRate?: number;
  onSaleCompleted: (sale: SaleTransaction) => void;
}

export function PosCheckoutDialog({
  open,
  onOpenChange,
  cart,
  customer,
  globalDiscount,
  notes,
  currencies,
  financialAccounts,
  paymentMethods,
  exchangeRate = 1,
  onSaleCompleted,
}: PosCheckoutDialogProps) {
  const queryClient = useQueryClient();

  const baseCurrency = currencies.find((c) => c.isBase) || currencies[0];
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalUSD = Math.max(0, subtotal - globalDiscount);
  const totalBs = Number((totalUSD * exchangeRate).toFixed(2));

  // Payments array
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Synchronize initial payment when modal opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    if (financialAccounts.length > 0 && paymentMethods.length > 0) {
      const defaultAccount = financialAccounts[0];
      const defaultMethod = paymentMethods[0];
      setPayments([
        {
          tempId: "pay-initial",
          financialAccountId: defaultAccount.id,
          paymentMethodId: defaultMethod.id,
          amount: totalUSD,
          currencyId: defaultAccount.currencyId || baseCurrency?.id || "",
          reference: "",
          accountName: defaultAccount.name,
          methodName: defaultMethod.name,
        },
      ]);
      setError(null);
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Total paid calculation
  const totalPaidUSD = payments.reduce((acc, p) => {
    const accObj = financialAccounts.find((a) => a.id === p.financialAccountId);
    const isBs = accObj?.currency?.code === "VES" || p.currencyCode === "VES";
    const amountInUSD = isBs ? (Number(p.amount || 0) / exchangeRate) : Number(p.amount || 0);
    return acc + amountInUSD;
  }, 0);

  const pendingBalanceUSD = Math.max(0, totalUSD - totalPaidUSD);
  const changeUSD = Math.max(0, totalPaidUSD - totalUSD);
  const changeBs = (changeUSD * exchangeRate).toFixed(2);

  // Quick Preset actions
  const setExactCashUSD = () => {
    const cashMethod = paymentMethods.find((m) => m.name.toLowerCase().includes("efectivo")) || paymentMethods[0];
    const cashAccount = financialAccounts.find((a) => a.name.toLowerCase().includes("caja")) || financialAccounts[0];
    if (!cashAccount || !cashMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: cashAccount.id,
        paymentMethodId: cashMethod.id,
        amount: totalUSD,
        currencyId: cashAccount.currencyId,
        reference: "",
        accountName: cashAccount.name,
        methodName: cashMethod.name,
      },
    ]);
  };

  const setExactPagoMovilVES = () => {
    const pmMethod = paymentMethods.find((m) => m.name.toLowerCase().includes("móvil") || m.name.toLowerCase().includes("movil")) || paymentMethods[0];
    const bankAccount = financialAccounts.find((a) => a.currency?.code === "VES" || a.name.toLowerCase().includes("banesco")) || financialAccounts[0];
    if (!bankAccount || !pmMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: bankAccount.id,
        paymentMethodId: pmMethod.id,
        amount: totalBs,
        currencyId: bankAccount.currencyId,
        reference: "",
        accountName: bankAccount.name,
        methodName: pmMethod.name,
        currencyCode: "VES",
      },
    ]);
  };

  const setExactZelleUSD = () => {
    const zelleMethod = paymentMethods.find((m) => m.name.toLowerCase().includes("zelle")) || paymentMethods[0];
    const zelleAccount = financialAccounts.find((a) => a.name.toLowerCase().includes("zelle")) || financialAccounts[0];
    if (!zelleAccount || !zelleMethod) return;

    setPayments([
      {
        tempId: `pay-${Date.now()}`,
        financialAccountId: zelleAccount.id,
        paymentMethodId: zelleMethod.id,
        amount: totalUSD,
        currencyId: zelleAccount.currencyId,
        reference: "",
        accountName: zelleAccount.name,
        methodName: zelleMethod.name,
      },
    ]);
  };

  const setCreditSale = () => {
    setPayments([]);
  };

  const handleAddPaymentRow = () => {
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
        currencyId: defaultAccount.currencyId,
        reference: "",
        accountName: defaultAccount.name,
        methodName: defaultMethod.name,
      },
    ]);
  };

  const handleRemovePaymentRow = (tempId: string) => {
    setPayments((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleUpdatePayment = (tempId: string, updates: Partial<PaymentEntry>) => {
    setPayments((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, ...updates } : p))
    );
  };

  // Submit sale mutation
  const submitSaleMutation = useMutation({
    mutationFn: async () => {
      setError(null);

      if (!baseCurrency?.id) {
        throw new Error("No se ha configurado la moneda base del sistema.");
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
        currencyId: baseCurrency.id,
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
        payments: payments.map((p) => ({
          financialAccountId: p.financialAccountId,
          paymentMethodId: p.paymentMethodId,
          amount: p.amount,
          currencyId: p.currencyId,
          reference: p.reference || undefined,
          notes: p.notes || undefined,
        })),
      };

      return api.post<SaleTransaction>("/sales", payload);
    },
    onSuccess: (createdSale) => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      onSaleCompleted(createdSale);
      onOpenChange(false);
      setPayments([]);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al registrar la venta.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold">
              Procesar Cobro / Registro de Venta
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Selecciona el método de pago o combina múltiples monedas y formas de cobro (Split Payment).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Atajos de Pago Rápido (1 Clic):
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setExactCashUSD}
                className="h-9 gap-1 text-xs justify-start px-2.5"
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="truncate">Efectivo USD</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setExactPagoMovilVES}
                className="h-9 gap-1 text-xs justify-start px-2.5"
              >
                <Smartphone className="h-3.5 w-3.5 text-blue-500" />
                <span className="truncate">Pago Móvil Bs</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setExactZelleUSD}
                className="h-9 gap-1 text-xs justify-start px-2.5"
              >
                <Landmark className="h-3.5 w-3.5 text-purple-500" />
                <span className="truncate">Zelle USD</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setCreditSale}
                className="h-9 gap-1 text-xs justify-start px-2.5 text-amber-600 dark:text-amber-400"
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="truncate">Venta a Crédito</span>
              </Button>
            </div>
          </div>

          {/* Total Overview Box */}
          <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs text-muted-foreground">Total a Cobrar:</span>
              <div className="text-xl font-bold text-foreground">
                ${totalUSD.toFixed(2)}
              </div>
            </div>

            {exchangeRate > 1 && (
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground">Equivalente en Bolívares:</span>
                <div className="text-sm font-semibold font-mono text-foreground">
                  Bs. {totalBs.toFixed(2)}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  (Tasa: {exchangeRate.toFixed(2)} Bs/$)
                </span>
              </div>
            )}
          </div>

          {/* Payments List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Desglose de Cobros ({payments.length}):
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleAddPaymentRow}
                className="text-[11px] text-primary gap-1 h-6"
              >
                <Plus className="h-3 w-3" />
                <span>+ Añadir Otro Pago / Moneda</span>
              </Button>
            </div>

            {payments.length === 0 ? (
              <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Venta sin abono inicial (Crédito)</span>
                </div>
                <p className="text-[11px] mt-0.5 opacity-90">
                  La orden se guardará con estatus <strong>PENDIENTE DE PAGO</strong> asociada a {customer?.name || "Cliente Mostrador"}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p, idx) => {
                  const account = financialAccounts.find((a) => a.id === p.financialAccountId);
                  const isVES = account?.currency?.code === "VES";

                  return (
                    <div
                      key={p.tempId}
                      className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground text-[11px]">
                          Cobro #{idx + 1}
                        </span>
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentRow(p.tempId)}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Financial Account */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Cuenta Destino</Label>
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
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
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
                          <Label className="text-[10px] text-muted-foreground">Método de Pago</Label>
                          <select
                            value={p.paymentMethodId}
                            onChange={(e) => handleUpdatePayment(p.tempId, { paymentMethodId: e.target.value })}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Amount */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            Monto {isVES ? "(en Bs.)" : "(en USD)"}
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={p.amount}
                            onChange={(e) =>
                              handleUpdatePayment(p.tempId, {
                                amount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-8 text-xs font-semibold"
                          />
                        </div>

                        {/* Reference */}
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            N° Referencia / Comprobante
                          </Label>
                          <Input
                            placeholder="Ej: 1234..."
                            value={p.reference || ""}
                            onChange={(e) =>
                              handleUpdatePayment(p.tempId, { reference: e.target.value })
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Balance Calculation */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Abonado (Equivalente USD):</span>
              <span className="font-semibold text-foreground">
                ${totalPaidUSD.toFixed(2)}
              </span>
            </div>

            {pendingBalanceUSD > 0.01 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span>Saldo Pendiente por Cobrar:</span>
                <span>${pendingBalanceUSD.toFixed(2)}</span>
              </div>
            )}

            {changeUSD > 0.01 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold border-t pt-1">
                <span>Cambio / Vuelto a Entregar:</span>
                <div>
                  <span>${changeUSD.toFixed(2)}</span>
                  {exchangeRate > 1 && (
                    <span className="text-[11px] text-muted-foreground ml-1.5 font-normal">
                      (Bs. {changeBs})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-3 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => submitSaleMutation.mutate()}
            disabled={submitSaleMutation.isPending}
            className="gap-2 font-bold shadow-xs"
          >
            {submitSaleMutation.isPending ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar Venta y Cobro</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
