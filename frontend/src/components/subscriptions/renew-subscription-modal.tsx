"use client";

import React, { useState } from "react";
import { type Subscription } from "@/types/streaming";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow } from "@/lib/utils";
import { RefreshCw, CheckCircle2, AlertCircle, DollarSign, Calendar } from "lucide-react";
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

interface RenewSubscriptionModalProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchangeRate?: number;
}

export function RenewSubscriptionModal({
  subscription,
  open,
  onOpenChange,
  exchangeRate = 1,
}: RenewSubscriptionModalProps) {
  const queryClient = useQueryClient();
  const nowTimestamp = useClientNow();

  const [daysToAdd, setDaysToAdd] = useState<number>(30);
  const [agreedPrice, setAgreedPrice] = useState<number>(
    Number(subscription?.agreedPrice || 0)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync state during render when subscription changes
  const [prevSubId, setPrevSubId] = useState<string | null>(null);
  if (subscription && subscription.id !== prevSubId) {
    setPrevSubId(subscription.id);
    setAgreedPrice(Number(subscription.agreedPrice || 0));
    setDaysToAdd(30);
    setError(null);
  } else if (!subscription && prevSubId !== null) {
    setPrevSubId(null);
  }

  const currentCutoff = subscription ? new Date(subscription.expirationDate) : new Date(nowTimestamp);
  const baseDate = currentCutoff.getTime() > nowTimestamp ? currentCutoff : new Date(nowTimestamp);
  const newCalculatedCutoff = new Date(baseDate);
  newCalculatedCutoff.setDate(newCalculatedCutoff.getDate() + daysToAdd);

  const priceBs = (agreedPrice * exchangeRate).toFixed(2);

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) return;
      setError(null);
      return api.post(`/subscriptions/${subscription.id}/renew`, {
        days: daysToAdd,
        agreedPrice,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-profiles"] });
      onOpenChange(false);
      setNotes("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al renovar la suscripción.");
    },
  });

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className="h-5 w-5" />
            <DialogTitle>Renovar Suscripción de Cliente</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Extiende la fecha de corte para <strong>{subscription.customer?.name}</strong> en {subscription.service?.name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2 text-xs">
          {/* Dates preview */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Fecha de vencimiento actual:</span>
              <span className="font-semibold text-foreground font-mono">
                {currentCutoff.toLocaleDateString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold border-t pt-1.5">
              <span>Nueva fecha de vencimiento:</span>
              <span className="font-mono text-sm">
                {newCalculatedCutoff.toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              Periodo a Renovar:
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={daysToAdd === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setDaysToAdd(30)}
                className="text-xs font-semibold"
              >
                +30 Días (1 Mes)
              </Button>
              <Button
                type="button"
                variant={daysToAdd === 60 ? "default" : "outline"}
                size="sm"
                onClick={() => setDaysToAdd(60)}
                className="text-xs font-semibold"
              >
                +60 Días (2 Meses)
              </Button>
              <Button
                type="button"
                variant={daysToAdd === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setDaysToAdd(90)}
                className="text-xs font-semibold"
              >
                +90 Días (3 Meses)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="renew-price">Precio de Renovación ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="renew-price"
                  type="number"
                  step="0.01"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(Number(e.target.value) || 0)}
                  className="pl-8 h-9 text-xs font-semibold"
                />
              </div>
              {exchangeRate > 1 && (
                <p className="text-[10px] text-muted-foreground">
                  Equivalente: Bs. {priceBs}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="renew-days">Días Personalizados</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="renew-days"
                  type="number"
                  min={1}
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(Number(e.target.value) || 1)}
                  className="pl-8 h-9 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="renew-notes">Observaciones / Referencia del Cobro</Label>
            <Input
              id="renew-notes"
              placeholder="Ej: Pago verificado por Pago Móvil..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            onClick={() => renewMutation.mutate()}
            disabled={renewMutation.isPending}
            className="gap-1.5 font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{renewMutation.isPending ? "Renovando..." : "Confirmar Renovación"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
