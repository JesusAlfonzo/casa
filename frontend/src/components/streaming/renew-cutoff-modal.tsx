"use client";

import React, { useState } from "react";
import { type StreamingAccount } from "@/types/streaming";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
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

interface RenewCutoffModalProps {
  account: StreamingAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenewCutoffModal({
  account,
  open,
  onOpenChange,
}: RenewCutoffModalProps) {
  const queryClient = useQueryClient();

  const [daysToAdd, setDaysToAdd] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  const currentCutoff = account ? new Date(account.supplierCutoffDate) : null;
  const newCalculatedCutoff = currentCutoff ? new Date(currentCutoff) : null;
  if (newCalculatedCutoff) {
    newCalculatedCutoff.setDate(newCalculatedCutoff.getDate() + daysToAdd);
  }

  const renewCutoffMutation = useMutation({
    mutationFn: async () => {
      if (!account || !newCalculatedCutoff) return;
      setError(null);
      return api.patch(`/streaming-accounts/${account.id}`, {
        supplierCutoffDate: newCalculatedCutoff.toISOString(),
        status: "AVAILABLE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-summary"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-stats"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al extender la fecha.");
    },
  });

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className="h-5 w-5" />
            <DialogTitle>Extender Fecha con Proveedor</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Renueva la mensualidad pagada al proveedor para la cuenta <strong>{account.accessEmail}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 py-2 text-xs">
          {/* Current cutoff vs New Cutoff */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Fecha de corte actual:</span>
              <span className="font-semibold text-foreground font-mono">
                {currentCutoff ? currentCutoff.toLocaleDateString() : "-"}
              </span>
            </div>

            <div className="flex justify-between items-center text-primary font-bold border-t pt-1.5">
              <span>Nueva fecha de corte:</span>
              <span className="font-mono text-sm">
                {newCalculatedCutoff ? newCalculatedCutoff.toLocaleDateString() : "-"}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              Periodo a extender:
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

          <div className="space-y-1.5">
            <Label htmlFor="custom-days">Días personalizados:</Label>
            <div className="relative">
              <Input
                id="custom-days"
                type="number"
                min={1}
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(Number(e.target.value) || 1)}
                className="h-9 text-xs"
              />
            </div>
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
            onClick={() => renewCutoffMutation.mutate()}
            disabled={renewCutoffMutation.isPending}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{renewCutoffMutation.isPending ? "Guardando..." : "Confirmar Renovación"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
