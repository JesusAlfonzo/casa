"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Store,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETTINGS_STATE,
  type FinancialAccountOption,
  type SystemSettingsState,
} from "@/components/settings/types";
import { BusinessSettingsSection } from "@/components/settings/business-settings-section";
import { WhatsAppSettingsSection } from "@/components/settings/whatsapp-settings-section";
import { SalesInventorySettingsSection } from "@/components/settings/sales-inventory-settings-section";
import { DollarSettingsSection } from "@/components/settings/dollar-settings-section";

type SettingsSectionId = "business" | "whatsapp" | "sales" | "dollar";

const NAV_ITEMS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "business",
    label: "Mi Negocio",
    description: "Nombre, teléfono y respaldo",
    icon: Store,
  },
  {
    id: "whatsapp",
    label: "Mensajes de WhatsApp",
    description: "Plantillas y avisos",
    icon: MessageCircle,
  },
  {
    id: "sales",
    label: "Ventas e Inventario",
    description: "Cuenta y existencias",
    icon: ShoppingBag,
  },
  {
    id: "dollar",
    label: "Dólar (Tasa BCV)",
    description: "Tasa del día",
    icon: DollarSign,
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("whatsapp");
  const [draft, setDraft] = useState<Partial<SystemSettingsState>>({});
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  // 1. Cargar configuraciones guardadas
  const { data: settingsResponse } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      try {
        const res = await api.get<{
          success?: boolean;
          data?: Partial<SystemSettingsState>;
        }>("/settings");
        return res.data || {};
      } catch {
        return {};
      }
    },
  });

  // 2. Cargar cuentas financieras para el selector de cuenta por defecto
  const { data: accountsData = [] } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: async () => {
      try {
        const res = await api.get<
          FinancialAccountOption[] | { data?: FinancialAccountOption[] }
        >("/financial-accounts");
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Cargar tasa BCV actual
  const { data: currentBcvRate = 0 } = useQuery({
    queryKey: ["current-bcv-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{
          rate?: number | string;
          data?: { rate?: number | string };
        }>("/exchange-rates/current");
        const rateVal = res.rate ?? res.data?.rate;
        return Number(rateVal) || 0;
      } catch {
        return 0;
      }
    },
  });

  const formData: SystemSettingsState = useMemo(
    () => ({
      ...DEFAULT_SETTINGS_STATE,
      ...(settingsResponse || {}),
      ...draft,
    }),
    [settingsResponse, draft]
  );

  const hasUnsavedChanges = Object.keys(draft).length > 0;

  // Guardar configuraciones
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<SystemSettingsState>) => {
      return api.patch<{
        success: boolean;
        message: string;
        data: SystemSettingsState;
      }>("/settings", payload);
    },
    onSuccess: (res) => {
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success(res.message || "Cambios guardados");
    },
    onError: (err: Error) => {
      toast.error(
        "No se pudieron guardar los cambios: " + (err.message || "Error")
      );
    },
  });

  const handleChange = <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS_STATE);
    toast.info(
      "Se cargaron los valores iniciales. Pulsa «Guardar cambios» para aplicarlos."
    );
  };

  const handleDownloadBackup = async () => {
    try {
      setIsDownloadingBackup(true);
      const res = await api.get<unknown>("/settings/backup");
      const blob = new Blob([JSON.stringify(res, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-ventas-casa-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Copia de seguridad descargada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudo descargar la copia: " + message);
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Encabezado limpio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configuración
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajusta cómo funciona tu negocio de forma sencilla.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Cambios sin guardar
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={saveMutation.isPending}
            className="h-10 px-3.5 text-sm gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restablecer</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasUnsavedChanges}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Guardar cambios</span>
          </Button>
        </div>
      </div>

      {/* Layout 2 columnas: Menú lateral + Panel de ajustes */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Menú lateral izquierdo */}
        <nav
          aria-label="Secciones de configuración"
          className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors shrink-0 lg:w-full",
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm leading-tight truncate">
                    {item.label}
                  </div>
                  <div className="hidden lg:block text-xs text-muted-foreground font-normal truncate mt-0.5">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Contenido principal */}
        <main className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xs">
          {activeSection === "business" && (
            <BusinessSettingsSection
              formData={formData}
              onChange={handleChange}
              onDownloadBackup={handleDownloadBackup}
              isDownloadingBackup={isDownloadingBackup}
            />
          )}

          {activeSection === "whatsapp" && (
            <WhatsAppSettingsSection
              formData={formData}
              onChange={handleChange}
            />
          )}

          {activeSection === "sales" && (
            <SalesInventorySettingsSection
              formData={formData}
              accounts={accountsData}
              onChange={handleChange}
            />
          )}

          {activeSection === "dollar" && (
            <DollarSettingsSection
              formData={formData}
              currentBcvRate={currentBcvRate}
              onChange={handleChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}
