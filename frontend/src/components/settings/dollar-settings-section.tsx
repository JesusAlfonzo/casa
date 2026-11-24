"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { SystemSettingsState } from "./types";

interface DollarSettingsSectionProps {
  formData: SystemSettingsState;
  currentBcvRate: number;
  onChange: <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => void;
}

export function DollarSettingsSection({
  formData,
  currentBcvRate,
  onChange,
}: DollarSettingsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Dólar (Tasa BCV)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Consulta el valor del dólar que usa el sistema para calcular precios
          en bolívares.
        </p>
      </div>

      <Separator />

      {/* Tasa actual */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">
            Tasa oficial registrada hoy
          </span>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            Bs. {Number(currentBcvRate || 0).toFixed(2)}{" "}
            <span className="text-base font-normal text-muted-foreground">
              por cada $1
            </span>
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 text-xs font-medium self-start sm:self-center">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Tasa activa</span>
        </div>
      </div>

      {/* Actualización automática */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          <Label
            htmlFor="switch-bcv-sync"
            className="text-sm font-medium cursor-pointer"
          >
            Actualizar la tasa del dólar automáticamente
          </Label>
          <p className="text-sm text-muted-foreground">
            El sistema revisa la tasa del BCV por sí solo para que no tengas que
            escribirla todos los días.
          </p>
        </div>

        <Switch
          id="switch-bcv-sync"
          checked={formData.finance_bcv_auto_sync}
          onCheckedChange={(checked) =>
            onChange("finance_bcv_auto_sync", checked)
          }
        />
      </div>
    </div>
  );
}
