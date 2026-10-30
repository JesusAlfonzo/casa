"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type CreateExchangeRateDTO,
  type Currency,
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
import { BadgeDollarSign, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ExchangeRateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialPair?: { sourceId: string; targetId: string };
}

const COMMON_SOURCES = [
  "BCV (Banco Central de Venezuela)",
  "EnParaleloVzla / Monitor",
  "Binance P2P",
  "Tasa Promedio Comercial",
  "Fijación Interna",
];

export function ExchangeRateFormModal({
  open,
  onOpenChange,
  onSuccess,
  initialPair,
}: ExchangeRateFormModalProps) {
  const queryClient = useQueryClient();

  // Cargar monedas disponibles
  const { data: currenciesData } = useQuery({
    queryKey: ["currencies-active"],
    queryFn: async () => {
      const res = await api.get<{ data: Currency[] } | Currency[]>("/currencies");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: Currency[] }).data)) {
        return (res as { data: Currency[] }).data;
      }
      return [];
    },
    enabled: open,
  });

  const currencies = Array.isArray(currenciesData) ? currenciesData : [];

  const [prevOpen, setPrevOpen] = useState(open);
  const [sourceCurrencyId, setSourceCurrencyId] = useState(initialPair?.sourceId || "");
  const [targetCurrencyId, setTargetCurrencyId] = useState(initialPair?.targetId || "");
  const [rate, setRate] = useState<number>(0);
  const [source, setSource] = useState(COMMON_SOURCES[0]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isActive, setIsActive] = useState(true);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (initialPair) {
        setSourceCurrencyId(initialPair.sourceId);
        setTargetCurrencyId(initialPair.targetId);
      } else {
        const usd = currencies.find((c) => c.code === "USD") || currencies[0];
        const ves = currencies.find((c) => c.code === "VES") || currencies[1];
        setSourceCurrencyId(usd?.id || "");
        setTargetCurrencyId(ves?.id || "");
      }
      setRate(0);
      setEffectiveFrom(new Date().toISOString().slice(0, 16));
      setIsActive(true);
    }
  }

  const effectiveSourceId =
    sourceCurrencyId ||
    initialPair?.sourceId ||
    currencies.find((c) => c.code === "USD")?.id ||
    currencies[0]?.id ||
    "";

  const effectiveTargetId =
    targetCurrencyId ||
    initialPair?.targetId ||
    currencies.find((c) => c.code === "VES")?.id ||
    currencies[1]?.id ||
    "";

  const sourceCur = currencies.find((c) => c.id === effectiveSourceId);
  const targetCur = currencies.find((c) => c.id === effectiveTargetId);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateExchangeRateDTO = {
        sourceCurrencyId: effectiveSourceId,
        targetCurrencyId: effectiveTargetId,
        rate: Number(rate),
        source: source.trim() || null,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        isActive,
      };
      return api.post("/exchange-rates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-rates"] });
      toast.success("Nueva tasa de cambio fijada exitosamente");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al fijar la tasa de cambio");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveSourceId || !effectiveTargetId) {
      toast.error("Debe seleccionar ambas monedas para el par cambiario");
      return;
    }
    if (effectiveSourceId === effectiveTargetId) {
      toast.error("La moneda de origen y destino no pueden ser iguales");
      return;
    }
    if (!rate || Number(rate) <= 0) {
      toast.error("La tasa debe ser mayor a 0");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Fijar Nueva Tasa de Cambio</DialogTitle>
              <DialogDescription className="text-xs">
                Actualiza el valor de cotización para facturación y conversiones.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Par Cambiario */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source-cur" className="text-xs font-semibold">
                Moneda Base / Origen
              </Label>
              <select
                id="source-cur"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={effectiveSourceId}
                onChange={(e) => setSourceCurrencyId(e.target.value)}
                required
              >
                <option value="">Seleccione Origen</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.symbol}) {c.isBase ? "★ Base" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-cur" className="text-xs font-semibold">
                Moneda Cotizada / Destino
              </Label>
              <select
                id="target-cur"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={effectiveTargetId}
                onChange={(e) => setTargetCurrencyId(e.target.value)}
                required
              >
                <option value="">Seleccione Destino</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner de par */}
          {sourceCur && targetCur && (
            <div className="flex items-center justify-center gap-3 p-3 rounded-md bg-muted text-xs font-medium">
              <span>1 {sourceCur.code} ({sourceCur.symbol})</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-bold font-mono text-primary">
                {rate ? Number(rate).toFixed(targetCur.decimals || 2) : "0.00"}{" "}
                {targetCur.code} ({targetCur.symbol})
              </span>
            </div>
          )}

          {/* Valor de Tasa */}
          <div className="space-y-1.5">
            <Label htmlFor="rate-value" className="text-xs font-semibold">
              Valor de Cotización <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rate-value"
              type="number"
              step="0.000001"
              placeholder="0.00"
              value={rate || ""}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              required
              className="text-sm font-mono font-bold"
            />
          </div>

          {/* Fuente / Referencia */}
          <div className="space-y-1.5">
            <Label htmlFor="rate-source" className="text-xs font-semibold">
              Fuente de Información
            </Label>
            <div className="space-y-1.5">
              <select
                id="rate-source"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {COMMON_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha Efectiva */}
          <div className="space-y-1.5">
            <Label htmlFor="rate-date" className="text-xs font-semibold">
              Vigente Desde (Fecha y Hora)
            </Label>
            <Input
              id="rate-date"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rate-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="rate-active" className="text-xs cursor-pointer">
              Marcar como tasa activa para el punto de venta
            </Label>
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
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Fijar Tasa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
