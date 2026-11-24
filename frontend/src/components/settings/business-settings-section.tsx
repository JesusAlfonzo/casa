"use client";

import React from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SystemSettingsState } from "./types";

interface BusinessSettingsSectionProps {
  formData: SystemSettingsState;
  onChange: <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => void;
  onDownloadBackup: () => void;
  isDownloadingBackup: boolean;
}

export function BusinessSettingsSection({
  formData,
  onChange,
  onDownloadBackup,
  isDownloadingBackup,
}: BusinessSettingsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Mi Negocio
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Nombre, teléfono de contacto y copia de seguridad de tus datos.
        </p>
      </div>

      <Separator />

      {/* Datos básicos */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="business-name" className="text-sm font-medium">
              Nombre del negocio
            </Label>
            <Input
              id="business-name"
              type="text"
              value={formData.system_system_name}
              onChange={(e) => onChange("system_system_name", e.target.value)}
              placeholder="Ej. Ventas de Casa"
              className="h-10 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Aparece en el sistema y en los recibos de venta.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-phone" className="text-sm font-medium">
              Teléfono o WhatsApp de contacto
            </Label>
            <Input
              id="business-phone"
              type="tel"
              value={formData.system_business_phone}
              onChange={(e) => onChange("system_business_phone", e.target.value)}
              placeholder="Ej. 0412-1234567"
              className="h-10 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Número principal donde te escriben tus clientes.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Copia de seguridad */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-base font-medium text-foreground">
                Copia de seguridad
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Guarda en tu computadora un archivo con tus clientes, productos,
              cuentas y membresías por si alguna vez necesitas restaurarlos.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onDownloadBackup}
            disabled={isDownloadingBackup}
            className="h-10 px-4 text-sm font-medium gap-2 shrink-0 bg-background"
          >
            {isDownloadingBackup ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Descargar copia</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
