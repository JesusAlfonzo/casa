"use client";

import React, { useState } from "react";
import {
  type SaleTransaction,
  type FinancialAccount,
  type PaymentMethod,
} from "@/types/pos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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

interface AddPaymentModalProps {
  sale: SaleTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financialAccounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  exchangeRate?: number;
}

export function AddPaymentModal({
  sale,
  open,
  onOpenChange,
  financialAccounts,
  paymentMethods,
  exchangeRate = 1,
}: AddPaymentModalProps) {
  const queryClient = useQueryClient();

  const total = Number(sale?.total || 0);
  const totalPaid = Number(sale?.totalCollected ?? sale?.totalPaid ?? 0);
  const pendingUSD = Math.max(0, total - totalPaid);

  const [financialAccountId, setFinancialAccountId] = useState(
    financialAccounts[0]?.id || ""
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    paymentMethods[0]?.id || ""
  );
  const [amount, setAmount] = useState<number>(pendingUSD);
  const [appliedRate, setAppliedRate] = useState<number>(
    exchangeRate > 0 ? exchangeRate : 1
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [prevSaleId, setPrevSaleId] = useState<string | null>(null);
  if (sale && sale.id !== prevSaleId) {
    setPrevSaleId(sale.id);
    setAmount(pendingUSD);
    setAppliedRate(exchangeRate > 0 ? exchangeRate : 1);
    setError(null);
  } else if (!sale && prevSaleId !== null) {
    setPrevSaleId(null);
  }

  const effectiveRate = appliedRate > 0 ? appliedRate : 1;
  const selectedAccount = financialAccounts.find(
    (a) => a.id === financialAccountId
  );
  const isVES = selectedAccount?.currency?.code === "VES";
  const amountInVES = (amount * effectiveRate).toFixed(2);

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!sale) return;
      if (amount <= 0) {
        throw new Error("El monto a abonar debe ser mayor a cero.");
      }

      const payload = {
        financialAccountId: financialAccountId || financialAccounts[0].id,
        paymentMethodId: paymentMethodId || paymentMethods[0].id,
        amount: isVES ? Number(amountInVES) : amount,
        currencyId: selectedAccount?.currencyId,
        exchangeRateValue: effectiveRate,
        reference: reference || undefined,
        notes: notes || undefined,
      };

      return api.post(`/sales/${sale.id}/payments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      onOpenChange(false);
      setReference("");
      setNotes("");
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Error al registrar el abono."
      );
    },
  });

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Encabezado fijo */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold">
                Registrar abono
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5 truncate">
                Venta{" "}
                <strong className="text-foreground">
                  {sale.documentNumber || sale.orderNumber || sale.id}
                </strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen del saldo */}
          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total de la venta</span>
              <span className="font-semibold text-foreground font-mono">
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Ya pagado</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                ${totalPaid.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-border pt-2">
              <span>Falta por pagar</span>
              <span className="font-mono">${pendingUSD.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cuenta donde entra</Label>
              <select
                value={financialAccountId || financialAccounts[0]?.id}
                onChange={(e) => setFinancialAccountId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {financialAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency?.code || "USD"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Forma de pago</Label>
              <select
                value={paymentMethodId || paymentMethods[0]?.id}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Monto a abonar ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-10 text-sm font-semibold font-mono"
                max={pendingUSD}
              />
              {isVES && (
                <p className="text-xs text-muted-foreground font-mono">
                  Equivalente: Bs. {amountInVES}
                </p>
              )}
            </div>

            {isVES ? (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Tasa usada (Bs. por $1)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={appliedRate || ""}
                  onChange={(e) =>
                    setAppliedRate(Math.max(0.01, Number(e.target.value) || 0))
                  }
                  className="h-10 text-sm font-mono font-semibold"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Referencia (opcional)
                </Label>
                <Input
                  placeholder="Ej. 987654"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>
            )}
          </div>

          {isVES && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Referencia (opcional)
              </Label>
              <Input
                placeholder="Ej. 987654"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-10 text-sm font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nota (opcional)</Label>
            <Input
              placeholder="Ej. Pagó por pago móvil"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Pie fijo */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addPaymentMutation.isPending}
            className="h-10 px-4 text-sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => addPaymentMutation.mutate()}
            disabled={addPaymentMutation.isPending}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            {addPaymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>
              {addPaymentMutation.isPending
                ? "Guardando..."
                : "Guardar abono"}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
