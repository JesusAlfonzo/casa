"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type PaymentTransaction } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  CreditCard,
  Calendar,
  User,
  ShoppingBag,
  AlertTriangle,
  Loader2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface TransactionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PaymentTransaction | null;
  onSuccess?: () => void;
}

export function TransactionDetailSheet({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionDetailSheetProps) {
  const queryClient = useQueryClient();
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      return api.post(`/payment-transactions/${transaction.id}/void`, {
        reason: voidReason.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Transacción de pago anulada y saldos revertidos");
      setIsVoidDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al anular la transacción");
    },
  });

  if (!transaction) return null;

  const isInflow = transaction.flowType === "INFLOW";
  const symbol = transaction.currency?.symbol || "$";
  const isVoidable = transaction.status === "VERIFIED" || transaction.status === "PENDING";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-md ${
                  isInflow
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {isInflow ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold">
                  Detalle de Transacción
                </SheetTitle>
                <SheetDescription className="text-xs font-mono">
                  ID: {transaction.id.slice(0, 8)}...
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-5 py-4 text-xs">
            {/* Monto destacado */}
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
              <span className="text-xs text-muted-foreground block mb-1">
                {isInflow ? "Monto Ingresado (+)" : "Monto Egresado (-)"}
              </span>
              <div
                className={`text-2xl font-bold font-mono tracking-tight ${
                  isInflow
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isInflow ? "+" : "-"}
                {symbol} {Number(transaction.amount).toFixed(2)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge
                  variant={
                    transaction.status === "VERIFIED"
                      ? "default"
                      : transaction.status === "PENDING"
                        ? "outline"
                        : "destructive"
                  }
                  className="text-[10px]"
                >
                  {transaction.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Moneda: {transaction.currency?.code || "USD"}
                </span>
              </div>
            </div>

            {/* Datos de la Cuenta y Método */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Medio de Pago & Cuenta
              </h4>
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                    <span>Cuenta Financiera:</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {transaction.financialAccount?.name || "N/A"}
                  </span>
                </div>
                {transaction.financialAccount?.bankName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Banco / Entidad:</span>
                    <span className="font-medium text-foreground">
                      {transaction.financialAccount.bankName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Método de Pago:</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {transaction.paymentMethod?.name || "N/A"}
                  </span>
                </div>
                {transaction.reference && (
                  <div className="flex items-center justify-between border-t border-border pt-1.5">
                    <span className="text-muted-foreground">Nº de Referencia:</span>
                    <span className="font-mono font-bold text-foreground">
                      {transaction.reference}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Operación Asociada (Venta o Compra) */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Operación Asociada
              </h4>
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                {transaction.saleId ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Cobro de Venta / Factura:</span>
                    </div>
                    <span className="font-mono text-primary font-semibold">
                      {transaction.saleId.slice(0, 8)}...
                    </span>
                  </div>
                ) : transaction.purchase ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Pago de Compra / Orden:</span>
                    </div>
                    <span className="font-mono text-primary font-semibold">
                      {transaction.purchase.orderNumber}
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Movimiento directo manual (Sin orden o factura vinculada)
                  </div>
                )}

                {transaction.notes && (
                  <div className="border-t border-border pt-1.5">
                    <span className="text-muted-foreground block mb-0.5">Observaciones:</span>
                    <p className="text-foreground italic">{transaction.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trazabilidad y Fechas */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Trazabilidad
              </h4>
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Fecha de Liquidación:</span>
                  </div>
                  <span className="text-foreground">
                    {new Date(transaction.paidAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Registrado por:</span>
                  </div>
                  <span className="text-foreground">
                    {transaction.user?.name || "Sistema"}
                  </span>
                </div>
              </div>
            </div>

            {/* Acción de Anulación */}
            {isVoidable && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full gap-2 text-xs"
                  onClick={() => setIsVoidDialogOpen(true)}
                >
                  <Ban className="h-4 w-4" />
                  <span>Anular Transacción y Revertir Saldos</span>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de Confirmación de Anulación */}
      <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base">¿Anular Transacción?</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Esta acción reversará el saldo de la cuenta financiera y actualizará el
              estado a <strong>REFUNDED</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="void-reason" className="text-xs font-semibold">
              Motivo de la Anulación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="void-reason"
              placeholder="ej: Pago duplicado / Referencia no acreditada"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVoidDialogOpen(false)}
              disabled={voidMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={voidMutation.isPending || !voidReason.trim()}
              onClick={() => voidMutation.mutate()}
              className="gap-2"
            >
              {voidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
