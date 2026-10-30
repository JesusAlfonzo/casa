"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type FinancialAccount, type AdjustBalanceDTO } from "@/types/finance";
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
import { Scale, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface AccountAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: FinancialAccount | null;
  onSuccess?: () => void;
}

export function AccountAdjustModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountAdjustModalProps) {
  const queryClient = useQueryClient();

  const [prevAccount, setPrevAccount] = useState<FinancialAccount | null | undefined>(account);
  const [newBalance, setNewBalance] = useState<number>(account ? Number(account.currentBalance) || 0 : 0);
  const [reason, setReason] = useState("");

  if (account !== prevAccount) {
    setPrevAccount(account);
    setNewBalance(account ? Number(account.currentBalance) || 0 : 0);
    setReason("");
  }

  const currentBalance = account ? Number(account.currentBalance) : 0;
  const difference = newBalance - currentBalance;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!account) return;
      const payload: AdjustBalanceDTO = {
        newBalance: Number(newBalance),
        reason: reason.trim(),
      };
      return api.post(`/financial-accounts/${account.id}/adjust-balance`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Saldo ajustado y auditado exitosamente");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al ajustar el saldo de la cuenta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Debe ingresar el motivo o justificativo del ajuste");
      return;
    }
    mutation.mutate();
  };

  if (!account) return null;

  const symbol = account.currency?.symbol || "$";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Ajuste / Arqueo de Saldo</DialogTitle>
              <DialogDescription className="text-xs">
                Concilia el balance real de <strong>{account.name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Comparativa de saldos */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/40 p-3 text-center">
            <div>
              <span className="text-[11px] text-muted-foreground block">Saldo Actual</span>
              <span className="text-sm font-bold font-mono text-foreground">
                {symbol} {currentBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Nuevo Saldo</span>
              <span className="text-sm font-bold font-mono text-primary">
                {symbol} {Number(newBalance || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Diferencia calculada */}
          <div className="flex justify-between items-center px-1 text-xs">
            <span className="text-muted-foreground">Diferencia neta a asentar:</span>
            <span
              className={`font-mono font-semibold ${
                difference > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : difference < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
              }`}
            >
              {difference > 0 ? "+" : ""}
              {symbol} {difference.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-balance" className="text-xs font-semibold">
              Nuevo Saldo Físico / Bancario <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj-balance"
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
              required
              className="text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason" className="text-xs font-semibold">
              Motivo o Justificación del Ajuste <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj-reason"
              placeholder="ej: Arqueo de cierre de caja / Comisión bancaria omitida"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
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
              disabled={mutation.isPending || difference === 0}
              className="gap-2"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
