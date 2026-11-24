"use client";

import React, { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SystemSettingsState } from "./types";

interface WhatsAppSettingsSectionProps {
  formData: SystemSettingsState;
  onChange: <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => void;
}

type TemplateKind = "reminder" | "delivery";

const REMINDER_TAGS = [
  { tag: "{cliente}", label: "Cliente" },
  { tag: "{servicio}", label: "Servicio" },
  { tag: "{fecha_corte}", label: "Fecha de vencimiento" },
  { tag: "{monto}", label: "Monto" },
];

const DELIVERY_TAGS = [
  { tag: "{cliente}", label: "Cliente" },
  { tag: "{servicio}", label: "Servicio" },
  { tag: "{email}", label: "Correo" },
  { tag: "{password}", label: "Clave" },
  { tag: "{perfil}", label: "Perfil" },
  { tag: "{pin}", label: "PIN" },
  { tag: "{fecha_corte}", label: "Vencimiento" },
];

export function WhatsAppSettingsSection({
  formData,
  onChange,
}: WhatsAppSettingsSectionProps) {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKind>("reminder");
  const [copied, setCopied] = useState(false);

  const isReminder = activeTemplate === "reminder";
  const currentField = isReminder
    ? "streaming_payment_reminder_template"
    : "streaming_whatsapp_template";
  const currentValue = formData[currentField];
  const currentTags = isReminder ? REMINDER_TAGS : DELIVERY_TAGS;

  const handleInsertTag = (tag: string) => {
    const separator =
      currentValue.length > 0 && !currentValue.endsWith(" ") && !currentValue.endsWith("\n")
        ? " "
        : "";
    onChange(currentField, `${currentValue}${separator}${tag}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentValue);
    setCopied(true);
    toast.success("Mensaje copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const previewText = currentValue
    .replace(/{cliente}/g, "Carlos Mendoza")
    .replace(/{servicio}/g, "Netflix 1 Pantalla")
    .replace(/{fecha_corte}/g, "15/11/2026")
    .replace(/{monto}/g, "$4.50")
    .replace(/{email}/g, "cuenta.vip@gmail.com")
    .replace(/{password}/g, "Segura2026*")
    .replace(/{perfil}/g, "Perfil 3")
    .replace(/{pin}/g, "4589");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Mensajes de WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personaliza los mensajes que envías a tus clientes de streaming y
          cuándo quieres que el sistema te avise de un vencimiento.
        </p>
      </div>

      <Separator />

      {/* Selector simple de plantilla */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTemplate("reminder")}
              className={cn(
                "flex-1 sm:flex-none rounded-md px-3.5 py-2 text-sm font-medium transition-all",
                isReminder
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recordatorio de pago
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate("delivery")}
              className={cn(
                "flex-1 sm:flex-none rounded-md px-3.5 py-2 text-sm font-medium transition-all",
                !isReminder
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Entrega de cuenta
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-9 gap-1.5 text-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar mensaje</span>
              </>
            )}
          </Button>
        </div>

        {/* Editor y vista previa */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="wa-template" className="text-sm font-medium">
                {isReminder
                  ? "Mensaje para recordar el pago de membresía"
                  : "Mensaje para entregar los datos de acceso"}
              </Label>
              <textarea
                id="wa-template"
                rows={6}
                value={currentValue}
                onChange={(e) => onChange(currentField, e.target.value)}
                placeholder="Escribe aquí el mensaje..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground leading-relaxed outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Toca un dato para insertarlo en el mensaje (se rellena solo con
                la información del cliente):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTags.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertTag(item.tag)}
                    className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:border-foreground/20 transition-colors"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vista previa realista de WhatsApp */}
          <div className="xl:col-span-5 space-y-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Así lo verá el cliente
            </span>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="rounded-xl rounded-tl-xs bg-emerald-500/12 dark:bg-emerald-950/50 border border-emerald-500/20 p-3.5 space-y-2">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">
                  {previewText || "Escribe un mensaje para ver cómo queda..."}
                </p>
                <div className="flex justify-end">
                  <span className="text-[11px] text-muted-foreground">
                    10:45 a. m. ✓✓
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Avisos de vencimiento */}
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label
              htmlFor="switch-auto-alerts"
              className="text-sm font-medium cursor-pointer"
            >
              Avisarme cuando una membresía esté por vencer
            </Label>
            <p className="text-sm text-muted-foreground">
              Te mostrará un aviso en el sistema para que no se te pase cobrar a
              tiempo.
            </p>
          </div>
          <Switch
            id="switch-auto-alerts"
            checked={formData.streaming_auto_notifications}
            onCheckedChange={(checked) =>
              onChange("streaming_auto_notifications", checked)
            }
          />
        </div>

        {formData.streaming_auto_notifications && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="days-before" className="text-sm font-medium">
                ¿Con cuántos días de anticipación avisar?
              </Label>
              <p className="text-xs text-muted-foreground">
                Por ejemplo, 3 o 5 días antes de la fecha de vencimiento.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Input
                id="days-before"
                type="number"
                min={1}
                max={30}
                value={formData.streaming_days_alert_cutoff}
                onChange={(e) =>
                  onChange(
                    "streaming_days_alert_cutoff",
                    Math.max(1, Math.min(30, Number(e.target.value) || 1))
                  )
                }
                className="w-20 h-10 text-center text-sm font-medium"
              />
              <span className="text-sm text-muted-foreground">días antes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
