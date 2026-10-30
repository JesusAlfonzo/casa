"use client";

import React, { useState } from "react";
import {
  type SaleTransaction,
  type FinancialAccount,
  type PaymentMethod,
} from "@/types/pos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
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
  const totalPaid = Number(sale?.totalPaid || 0);
  const pendingUSD = Math.max(0, total - totalPaid);

  const [financialAccountId, setFinancialAccountId] = useState(
    financialAccounts[0]?.id || ""
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    paymentMethods[0]?.id || ""
  );
  const [amount, setAmount] = useState<number>(pendingUSD);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Synchronize when sale changes during render
  const [prevSaleId, setPrevSaleId] = useState<string | null>(null);
  if (sale && sale.id !== prevSaleId) {
    setPrevSaleId(sale.id);
    setAmount(pendingUSD);
    setError(null);
  } else if (!sale && prevSaleId !== null) {
    setPrevSaleId(null);
  }

  const selectedAccount = financialAccounts.find((a) => a.id === financialAccountId);
  const isVES = selectedAccount?.currency?.code === "VES";
  const amountInVES = (amount * exchangeRate).toFixed(2);

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
        reference: reference || undefined,
        notes: notes || undefined,
      };

      return api.post(`/sales/${sale.id}/payments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      onOpenChange(false);
      setReference("");
      setNotes("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al registrar el cobro.");
    },
  });

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <DialogTitle>Abonar Pago a Venta</DialogTitle>
          </div>
          <DialogDescription>
            Registra un nuevo abono para la orden <strong>{sale.documentNumber || sale.orderNumber || sale.id}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 py-2 text-xs">
          {/* Balance card */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Total de la venta:</span>
              <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total abonado anteriormente:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${totalPaid.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t pt-1">
              <span>Saldo restante por cobrar:</span>
              <span>${pendingUSD.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cuenta Destino</Label>
              <select
                value={financialAccountId || financialAccounts[0]?.id}
                onChange={(e) => setFinancialAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {financialAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency?.code || "USD"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <select
                value={paymentMethodId || paymentMethods[0]?.id}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto a Abonar ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-9 text-xs font-semibold"
                max={pendingUSD}
              />
              {isVES && (
                <p className="text-[10px] text-muted-foreground">
                  Equivalente: Bs. {amountInVES}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>N° Referencia / Recibo</Label>
              <Input
                placeholder="Ej: 987654"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas del abono (Opcional)</Label>
            <Input
              placeholder="Ej: Pago parcial por transferencia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={() => addPaymentMutation.mutate()}
            disabled={addPaymentMutation.isPending}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{addPaymentMutation.isPending ? "Registrando..." : "Registrar Abono"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
