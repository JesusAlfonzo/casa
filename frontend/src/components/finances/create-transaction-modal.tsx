"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type PaymentFlowType,
  type FinancialAccount,
  type PaymentMethod,
  type CreatePaymentTransactionDTO,
} from "@/types/finance";
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
import { Receipt, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultFlowType?: PaymentFlowType;
}

export function CreateTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  defaultFlowType = "INFLOW",
}: CreateTransactionModalProps) {
  const queryClient = useQueryClient();

  // Cargar cuentas financieras activas
  const { data: accountsData } = useQuery({
    queryKey: ["financial-accounts-active"],
    queryFn: async () => {
      const res = await api.get<{ data: FinancialAccount[] } | FinancialAccount[]>(
        "/financial-accounts?limit=100&isActive=true"
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: FinancialAccount[] }).data)) {
        return (res as { data: FinancialAccount[] }).data;
      }
      return [];
    },
    enabled: open,
  });

  // Cargar métodos de pago activos
  const { data: methodsData } = useQuery({
    queryKey: ["payment-methods-active"],
    queryFn: async () => {
      const res = await api.get<{ data: PaymentMethod[] } | PaymentMethod[]>(
        "/payment-methods?limit=100"
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: PaymentMethod[] }).data)) {
        return (res as { data: PaymentMethod[] }).data;
      }
      return [];
    },
    enabled: open,
  });

  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const paymentMethods = Array.isArray(methodsData) ? methodsData : [];

  const [prevOpen, setPrevOpen] = useState(open);
  const [flowType, setFlowType] = useState<PaymentFlowType>(defaultFlowType);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState("");

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFlowType(defaultFlowType);
      setAmount(0);
      setReference("");
      setNotes("");
      setPaidAt(new Date().toISOString().slice(0, 10));
      if (accounts.length > 0) setFinancialAccountId(accounts[0].id);
      if (paymentMethods.length > 0) setPaymentMethodId(paymentMethods[0].id);
    }
  }

  const effectiveAccountId = financialAccountId || accounts[0]?.id || "";
  const effectiveMethodId = paymentMethodId || paymentMethods[0]?.id || "";

  const selectedAccount = accounts.find((a) => a.id === effectiveAccountId);
  const symbol = selectedAccount?.currency?.symbol || "$";

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreatePaymentTransactionDTO = {
        flowType,
        status: "VERIFIED",
        financialAccountId: effectiveAccountId,
        paymentMethodId: effectiveMethodId,
        amount: Number(amount),
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        paidAt: new Date(paidAt).toISOString(),
      };
      return api.post("/payment-transactions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success(
        flowType === "INFLOW"
          ? "Ingreso registrado y acreditado en cuenta"
          : "Egreso registrado y debitado de cuenta"
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al asentar la transacción de pago");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAccountId) {
      toast.error("Seleccione una cuenta financiera");
      return;
    }
    if (!effectiveMethodId) {
      toast.error("Seleccione un método de pago");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-md ${
                flowType === "INFLOW"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {flowType === "INFLOW"
                  ? "Registrar Ingreso / Cobro Manual"
                  : "Registrar Egreso / Gasto Manual"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Asienta un movimiento directo que impactará el saldo de la cuenta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Selector de Flujo: Ingreso vs Egreso */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setFlowType("INFLOW")}
              className={`flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                flowType === "INFLOW"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>Ingreso (+ Entrada)</span>
            </button>
            <button
              type="button"
              onClick={() => setFlowType("OUTFLOW")}
              className={`flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                flowType === "OUTFLOW"
                  ? "bg-background text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Egreso (- Salida)</span>
            </button>
          </div>

          {/* Cuenta Financiera */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-account" className="text-xs font-semibold">
              Cuenta Financiera Destino/Origen <span className="text-destructive">*</span>
            </Label>
            <select
              id="tx-account"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={effectiveAccountId}
              onChange={(e) => setFinancialAccountId(e.target.value)}
              required
            >
              <option value="">Seleccione Cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency?.code} - Saldo: {a.currency?.symbol}
                  {Number(a.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Método de Pago */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-method" className="text-xs font-semibold">
              Método de Pago <span className="text-destructive">*</span>
            </Label>
            <select
              id="tx-method"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={effectiveMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              required
            >
              <option value="">Seleccione Método de Pago</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount" className="text-xs font-semibold">
                Monto ({symbol}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date" className="text-xs font-semibold">
                Fecha de Pago
              </Label>
              <Input
                id="tx-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          {/* Referencia */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-ref" className="text-xs font-semibold">
              Nº de Referencia / Voucher (Opcional)
            </Label>
            <Input
              id="tx-ref"
              placeholder="ej: REF-984321 / Hash Binance"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {/* Concepto / Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-notes" className="text-xs font-semibold">
              Concepto / Observaciones
            </Label>
            <Input
              id="tx-notes"
              placeholder="ej: Pago de luz oficina / Aporte de capital"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={`gap-2 ${
                flowType === "INFLOW"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {flowType === "INFLOW" ? "Asentar Ingreso" : "Asentar Egreso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
