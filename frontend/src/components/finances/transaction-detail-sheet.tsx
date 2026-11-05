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
  Clock,
  FileText,
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
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
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
  const amount = Number(transaction.amount || 0);
  const isVoidable = transaction.status === "VERIFIED" || transaction.status === "PENDING";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="text-left px-6 py-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3.5 pr-6">
              <div
                className={`p-3 rounded-xl shrink-0 shadow-2xs ${
                  isInflow
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {isInflow ? (
                  <ArrowDownLeft className="h-6 w-6" />
                ) : (
                  <ArrowUpRight className="h-6 w-6" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isInflow ? "Comprobante de Ingreso / Cobro" : "Comprobante de Egreso / Pago"}
                </SheetTitle>
                <SheetDescription className="text-xs font-mono mt-0.5">
                  Transacción #{transaction.id.slice(0, 8)}...
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 space-y-6 text-xs">
            {/* Monto destacado con espaciado amplio */}
            <div className="rounded-xl border border-border bg-muted/30 p-5 text-center shadow-xs space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block">
                {isInflow ? "Monto Ingresado y Acreditado (+)" : "Monto Egresado y Debitado (-)"}
              </span>
              <div
                className={`text-3xl font-bold font-mono tracking-tight ${
                  isInflow
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isInflow ? "+" : "-"}
                {symbol} {amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Badge
                  variant={
                    transaction.status === "VERIFIED"
                      ? "default"
                      : transaction.status === "PENDING"
                        ? "outline"
                        : "destructive"
                  }
                  className="text-[11px] font-medium px-2 py-0.5"
                >
                  {transaction.status === "VERIFIED"
                    ? "Verificado / Liquidado"
                    : transaction.status === "PENDING"
                      ? "Pendiente"
                      : transaction.status === "REFUNDED"
                        ? "Anulado / Revertido"
                        : transaction.status}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono font-medium">
                  {transaction.currency?.code || "USD"}
                </span>
              </div>
            </div>

            {/* Datos de la Cuenta y Método */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Medio de Pago & Cuenta Receptora
              </h4>
              <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span>Cuenta Financiera:</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {transaction.financialAccount?.name || "No especificada"}
                  </span>
                </div>
                {transaction.financialAccount?.bankName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Banco / Entidad:</span>
                    <span className="font-medium text-foreground">
                      {transaction.financialAccount.bankName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Método de Pago:</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {transaction.paymentMethod?.name || "Desconocido"}
                  </span>
                </div>
                {transaction.reference && (
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground font-medium">Nº de Referencia / Comprobante:</span>
                    <span className="font-mono font-bold text-foreground">
                      {transaction.reference}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Operación Asociada (Venta o Compra) */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Operación Asociada
              </h4>
              <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card shadow-2xs">
                {transaction.saleId ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <span>Cobro de Venta / Factura:</span>
                    </div>
                    <span className="font-mono text-primary font-bold">
                      #{transaction.saleId.slice(0, 8)}
                    </span>
                  </div>
                ) : transaction.purchase ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <span>Pago Compra / Orden:</span>
                    </div>
                    <span className="font-mono text-primary font-bold">
                      #{transaction.purchase.orderNumber}
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground/60" />
                    <span>Movimiento directo manual (Sin orden o venta vinculada)</span>
                  </div>
                )}

                {transaction.notes && (
                  <div className="border-t border-border pt-2">
                    <span className="text-muted-foreground block mb-1 font-medium">Observaciones / Notas:</span>
                    <p className="text-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 italic">
                      {transaction.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Trazabilidad y Fechas */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Trazabilidad y Auditoría
              </h4>
              <div className="rounded-xl border border-border p-4 space-y-2.5 bg-card shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Fecha de Liquidación:</span>
                  </div>
                  <span className="text-foreground font-mono">
                    {new Date(transaction.paidAt || transaction.createdAt).toLocaleDateString("es-VE", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <User className="h-4 w-4 text-primary" />
                    <span>Operador Responsable:</span>
                  </div>
                  <span className="text-foreground font-medium">
                    {transaction.user?.name || "Sistema Automático"}
                  </span>
                </div>
              </div>
            </div>

            {/* Acción de Anulación */}
            {isVoidable && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full gap-2 text-xs h-9 shadow-xs"
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
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base">¿Anular Transacción?</DialogTitle>
            </div>
            <DialogDescription className="text-xs mt-1">
              Esta acción reversará el saldo de la cuenta financiera correspondiente y actualizará su
              estado contable a <strong>REFUNDED</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <Label htmlFor="void-reason" className="text-xs font-semibold">
              Motivo o Justificativo de la Anulación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="void-reason"
              placeholder="ej: Pago duplicado por error / Referencia no acreditada en banco"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="gap-2">
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
