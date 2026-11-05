"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Tv,
  BadgeDollarSign,
  Warehouse,
  ShieldCheck,
  Save,
  RotateCcw,
  Copy,
  Check,
  Download,
  AlertCircle,
  Sparkles,
  MessageCircle,
  Clock,
  Landmark,
  Percent,
  Sliders,
  Database,
  Info,
  Server,
  Lock,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SystemSettingsState {
  // 3. Streaming & WhatsApp
  streaming_whatsapp_template: string;
  streaming_days_alert_cutoff: number;
  streaming_grace_period_days: number;
  streaming_auto_notifications: boolean;

  // 4. Finanzas & Tasa BCV
  finance_bcv_auto_sync: boolean;
  finance_exchange_margin_percent: number;
  finance_default_cash_account_id: string;
  finance_cash_alert_limit_usd: number;
  finance_cash_alert_limit_ves: number;

  // 5. Inventario & Almacenes
  inventory_global_min_stock_alert: number;
  inventory_default_profit_margin: number;
  inventory_default_location_id: string;
  inventory_allow_zero_stock_sales: boolean;

  // 6. Sistema & Seguridad
  system_session_timeout_minutes: number;
  system_system_name: string;
  system_business_phone: string;
  system_enable_audit_logs: boolean;
}

const DEFAULT_STATE: SystemSettingsState = {
  streaming_whatsapp_template:
    "Hola {cliente}, aquí tienes los accesos a tu cuenta de {servicio}:\n\n📧 Correo: {email}\n🔑 Clave: {password}\n👤 Perfil: {perfil}\n🔒 PIN: {pin}\n📅 Vence el: {fecha_corte}\n\n¡Gracias por preferirnos!",
  streaming_days_alert_cutoff: 5,
  streaming_grace_period_days: 2,
  streaming_auto_notifications: true,

  finance_bcv_auto_sync: true,
  finance_exchange_margin_percent: 0,
  finance_default_cash_account_id: "",
  finance_cash_alert_limit_usd: 500,
  finance_cash_alert_limit_ves: 25000,

  inventory_global_min_stock_alert: 5,
  inventory_default_profit_margin: 30,
  inventory_default_location_id: "",
  inventory_allow_zero_stock_sales: false,

  system_session_timeout_minutes: 60,
  system_system_name: "CASA ERP",
  system_business_phone: "",
  system_enable_audit_logs: true,
};

interface FinancialAccountItem {
  id: string;
  name: string;
  accountType: string;
  currency: {
    code: string;
    symbol: string;
  };
}

interface LocationItem {
  id: string;
  name: string;
  code?: string;
  address?: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState<SystemSettingsState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<string>("streaming");
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  // 1. Cargar configuraciones del backend
  const { data: settingsResponse, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success?: boolean; data?: SystemSettingsState }>("/settings");
        return res.data || DEFAULT_STATE;
      } catch {
        return DEFAULT_STATE;
      }
    },
  });

  // 2. Cargar cuentas financieras para el selector de caja chica
  const { data: accountsData } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/financial-accounts");
        if (Array.isArray(res)) return res as FinancialAccountItem[];
        if (res && Array.isArray(res.data)) return res.data as FinancialAccountItem[];
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Cargar almacenes para el selector de almacén por defecto
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/locations");
        if (Array.isArray(res)) return res as LocationItem[];
        if (res && Array.isArray(res.data)) return res.data as LocationItem[];
        return [];
      } catch {
        return [];
      }
    },
  });

  // 4. Cargar tasa oficial actual
  const { data: currentBcvRate } = useQuery({
    queryKey: ["current-bcv-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate?: number | string; data?: { rate?: number | string } }>("/exchange-rates/current");
        const rateVal = res.rate ?? res.data?.rate;
        return Number(rateVal) || 0;
      } catch {
        return 0;
      }
    },
  });

  // Sincronizar estado local al cargar desde el servidor
  useEffect(() => {
    if (settingsResponse) {
      setFormData((prev) => ({
        ...prev,
        ...settingsResponse,
      }));
    }
  }, [settingsResponse]);

  // Mutación para guardar configuraciones
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<SystemSettingsState>) => {
      return api.patch<{ success: boolean; message: string; data: SystemSettingsState }>(
        "/settings",
        payload
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success(res.message || "Configuraciones guardadas exitosamente");
    },
    onError: (err: any) => {
      toast.error("Error al guardar configuraciones: " + (err.message || "Error desconocido"));
    },
  });

  const handleChange = <K extends keyof SystemSettingsState>(
    field: K,
    value: SystemSettingsState[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_STATE);
    toast.info("Valores restablecidos a los valores predeterminados.");
  };

  const handleInsertVariable = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      streaming_whatsapp_template: prev.streaming_whatsapp_template + " " + tag,
    }));
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(formData.streaming_whatsapp_template);
    setCopied(true);
    toast.success("Plantilla copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generación y descarga directa del respaldo JSON
  const handleDownloadBackup = async () => {
    try {
      setIsDownloadingBackup(true);
      const res = await api.get<any>("/settings/backup");
      const blob = new Blob([JSON.stringify(res, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-casa-erp-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Copia de respaldo generada y descargada exitosamente");
    } catch (e: any) {
      toast.error("Error al descargar respaldo: " + (e.message || "Error"));
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // Render simulado del mensaje de WhatsApp con datos de muestra
  const renderWhatsAppPreview = () => {
    const text = formData.streaming_whatsapp_template
      .replace(/{cliente}/g, "Carlos Mendoza")
      .replace(/{servicio}/g, "Netflix Premium 4K")
      .replace(/{email}/g, "cuenta.vip@gmail.com")
      .replace(/{password}/g, "Segura2026*")
      .replace(/{perfil}/g, "Pantalla #3 (Carlos)")
      .replace(/{pin}/g, "4589")
      .replace(/{fecha_corte}/g, "15/11/2026");

    return text;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER DE CONFIGURACIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Configuración del Sistema
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Módulos 3, 4, 5 & 6
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Parámetros operativos de automatización de streaming, tesorería y BCV, reglas de almacén y seguridad.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saveMutation.isPending}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restablecer</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs shadow-primary/20"
          >
            {saveMutation.isPending ? (
              <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Guardar Cambios</span>
          </Button>
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS (TABS) */}
      <Tabs
        defaultValue="streaming"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60 max-w-full overflow-x-auto">
          <TabsTrigger
            value="streaming"
            className="gap-2 text-xs font-semibold px-3 py-2 data-active:bg-background data-active:shadow-2xs rounded-lg"
          >
            <Tv className="h-4 w-4 text-purple-500" />
            <span>3. Streaming & WhatsApp</span>
          </TabsTrigger>

          <TabsTrigger
            value="finance"
            className="gap-2 text-xs font-semibold px-3 py-2 data-active:bg-background data-active:shadow-2xs rounded-lg"
          >
            <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
            <span>4. Finanzas & Tasa BCV</span>
          </TabsTrigger>

          <TabsTrigger
            value="inventory"
            className="gap-2 text-xs font-semibold px-3 py-2 data-active:bg-background data-active:shadow-2xs rounded-lg"
          >
            <Warehouse className="h-4 w-4 text-blue-500" />
            <span>5. Inventario & Almacenes</span>
          </TabsTrigger>

          <TabsTrigger
            value="system"
            className="gap-2 text-xs font-semibold px-3 py-2 data-active:bg-background data-active:shadow-2xs rounded-lg"
          >
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span>6. Sistema & Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 3: STREAMING & NOTIFICACIONES (WHATSAPP)
        ========================================================================= */}
        <TabsContent value="streaming" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor de Plantilla WhatsApp */}
            <div className="lg:col-span-7 space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Plantilla de Entrega por WhatsApp
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Mensaje estructurado para enviar credenciales directamente al comprador.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleCopyTemplate}
                  className="gap-1 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Botones de Variables Dinámicas */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Variables dinámicas disponibles (haz clic para insertar):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "{cliente}",
                    "{servicio}",
                    "{email}",
                    "{password}",
                    "{perfil}",
                    "{pin}",
                    "{fecha_corte}",
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Área de Texto */}
              <div className="space-y-1.5">
                <textarea
                  rows={6}
                  value={formData.streaming_whatsapp_template}
                  onChange={(e) =>
                    handleChange("streaming_whatsapp_template", e.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  placeholder="Redacta el mensaje..."
                />
              </div>

              {/* Parámetros de Alerta y Días de Gracia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Días de anticipación para alertas de corte</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Avisa en el Dashboard cuando una cuenta venza en X días.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.streaming_days_alert_cutoff}
                      onChange={(e) =>
                        handleChange(
                          "streaming_days_alert_cutoff",
                          Number(e.target.value) || 1
                        )
                      }
                      className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted-foreground">días antes</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-purple-500" />
                    <span>Días de tolerancia / gracia para clientes</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Tiempo para pagar antes de considerar la suscripción morosa.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={formData.streaming_grace_period_days}
                      onChange={(e) =>
                        handleChange(
                          "streaming_grace_period_days",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted-foreground">días de gracia</span>
                  </div>
                </div>
              </div>

              {/* Notificaciones Automáticas */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Alertas automáticas en Centro de Notificaciones
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Generar notificaciones in-app cuando haya cortes próximos.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.streaming_auto_notifications}
                  onChange={(e) =>
                    handleChange("streaming_auto_notifications", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Previsualización en Vivo de WhatsApp */}
            <div className="lg:col-span-5 space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Previsualización en Vivo
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Vista Cliente
                </Badge>
              </div>

              {/* Simulación Burbuja WhatsApp */}
              <div className="rounded-xl bg-muted/40 p-4 border border-border/60 min-h-[220px] flex flex-col justify-between">
                <div className="bg-emerald-600/10 dark:bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold border-b border-emerald-500/20 pb-1">
                    <span>Mensaje WhatsApp</span>
                    <span>Hoy, 10:45 AM</span>
                  </div>
                  <pre className="text-xs font-sans whitespace-pre-wrap text-foreground leading-relaxed break-words">
                    {renderWhatsAppPreview()}
                  </pre>
                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      Enviado <Check className="h-3 w-3 text-sky-500 inline" />
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground text-center mt-3">
                  💡 Las etiquetas entre llaves se sustituyen automáticamente al pulsar el botón de compartir por WhatsApp en el módulo de suscripciones.
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 4: FINANZAS & PARÁMETROS BCV
        ========================================================================= */}
        <TabsContent value="finance" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parámetros Tasa Oficial & Sincronización */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <BadgeDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Sincronización y Tasa Oficial BCV
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Control de paridad cambiaria oficial y salvaguardas de cobro.
                  </p>
                </div>
              </div>

              {/* Tasa Viva Actual */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Tasa Oficial BCV Registrada:
                  </span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    Bs. {Number(currentBcvRate || 0).toFixed(2)} / USD
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  En Línea
                </Badge>
              </div>

              {/* Sincronización Automática */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Actualización automática periódica
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Verificar y consultar la tasa oficial periódicamente en segundo plano.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.finance_bcv_auto_sync}
                  onChange={(e) =>
                    handleChange("finance_bcv_auto_sync", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Margen de Cobertura Cambiaria */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-primary" />
                  <span>Margen de Cobertura Cambiaria (%)</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Porcentaje de holgura opcional sobre la tasa oficial para amortiguar fluctuaciones en cobros diferidos (ej. 0% = tasa exacta, 2% = +2%).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={20}
                    value={formData.finance_exchange_margin_percent}
                    onChange={(e) =>
                      handleChange(
                        "finance_exchange_margin_percent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">% adicional sobre BCV</span>
                </div>
              </div>
            </div>

            {/* Caja Chica Predeterminada & Alertas de Efectivo */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Caja Chica y Límites de Efectivo
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Parámetros de recaudación y topes de seguridad en mostrador.
                  </p>
                </div>
              </div>

              {/* Selector de Caja Predeterminada */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Cuenta / Caja Chica por Defecto para POS
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Cuenta que recibe automáticamente los pagos en efectivo o transferencias en caja.
                </p>
                <select
                  value={formData.finance_default_cash_account_id}
                  onChange={(e) =>
                    handleChange("finance_default_cash_account_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Seleccionar cuenta predeterminada --</option>
                  {(accountsData || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType} • {acc.currency?.code || "USD"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Topes de Alerta de Efectivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tope Alerta Efectivo (USD)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Avisar si la caja física supera este monto.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={formData.finance_cash_alert_limit_usd}
                      onChange={(e) =>
                        handleChange(
                          "finance_cash_alert_limit_usd",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tope Alerta Efectivo (Bs.)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Avisar si el efectivo en Bs supera este tope.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-muted-foreground">Bs</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={formData.finance_cash_alert_limit_ves}
                      onChange={(e) =>
                        handleChange(
                          "finance_cash_alert_limit_ves",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground">
                🛡️ Si la caja física supera estos topes, el sistema mostrará una sugerencia de &ldquo;Arqueo / Depósito Bancario&rdquo; para resguardar fondos.
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 5: INVENTARIO & ALMACENES
        ========================================================================= */}
        <TabsContent value="inventory" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parámetros de Almacén Principal & Sobreventas */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Warehouse className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Almacén de Operación y Políticas
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Configuración de depósito predeterminado y reglas de egreso.
                  </p>
                </div>
              </div>

              {/* Selector de Almacén Principal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Almacén Principal para Ventas del POS
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Depósito del que se descuenta el stock de forma predeterminada al facturar.
                </p>
                <select
                  value={formData.inventory_default_location_id}
                  onChange={(e) =>
                    handleChange("inventory_default_location_id", e.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Seleccionar almacén por defecto --</option>
                  {(locationsData || []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Política de Ventas con Stock Cero */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      Permitir ventas con stock en cero (Sobreventa)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Si se desactiva, el POS bloqueará la venta de productos agotados.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.inventory_allow_zero_stock_sales}
                    onChange={(e) =>
                      handleChange("inventory_allow_zero_stock_sales", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {formData.inventory_allow_zero_stock_sales
                    ? "⚠️ Alerta: Los productos podrán venderse aunque el stock sea 0, generando saldo negativo."
                    : "🔒 Seguro: El sistema exige existencias disponibles en almacén antes de procesar el cobro."}
                </div>
              </div>
            </div>

            {/* Reglas de Stock Crítico y Margen Sugerido */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Umbrales y Márgenes Sugeridos
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Estándares globales aplicados a productos y compras.
                  </p>
                </div>
              </div>

              {/* Umbral de Stock Crítico Global */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Umbral de Stock Crítico Global (Unidades)</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Alerta por defecto para productos que no tengan un stock mínimo individual.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.inventory_global_min_stock_alert}
                    onChange={(e) =>
                      handleChange(
                        "inventory_global_min_stock_alert",
                        Number(e.target.value) || 1
                      )
                    }
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">unidades mínimas</span>
                </div>
              </div>

              {/* Margen de Ganancia Sugerido */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Margen de Ganancia Sugerido (%)</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Porcentaje sugerido para calcular el precio de venta en compras a proveedores.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min={5}
                    max={200}
                    value={formData.inventory_default_profit_margin}
                    onChange={(e) =>
                      handleChange(
                        "inventory_default_profit_margin",
                        Number(e.target.value) || 30
                      )
                    }
                    className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">% de rentabilidad</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground">
                📦 Ejemplo: Un artículo con costo de <strong>$10.00</strong> se cotizará automáticamente a <strong>$13.00</strong> con un margen del 30%.
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 6: SISTEMA, SEGURIDAD & SESIONES
        ========================================================================= */}
        <TabsContent value="system" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seguridad y Sesiones */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Seguridad y Control de Sesión
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Tiempos de expiración por inactividad y auditoría.
                  </p>
                </div>
              </div>

              {/* Tiempo de Inactividad */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tiempo de Inactividad de Sesión
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Cierra la sesión automáticamente si no se detecta actividad en el navegador.
                </p>
                <select
                  value={formData.system_session_timeout_minutes}
                  onChange={(e) =>
                    handleChange(
                      "system_session_timeout_minutes",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={15}>15 minutos (Alta seguridad / Terminal compartida)</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora (Recomendado)</option>
                  <option value={240}>4 horas</option>
                  <option value={480}>8 horas (Jornada laboral completa)</option>
                  <option value={0}>Sin límite (No recomendado)</option>
                </select>
              </div>

              {/* Auditoría de Acciones */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Registro de Auditoría del Sistema
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Registrar quién realiza modificaciones críticas y anulaciones.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.system_enable_audit_logs}
                  onChange={(e) =>
                    handleChange("system_enable_audit_logs", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Nombre Comercial del Sistema */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nombre Comercial / Identificador
                </label>
                <input
                  type="text"
                  value={formData.system_system_name}
                  onChange={(e) => handleChange("system_system_name", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  placeholder="CASA ERP"
                />
              </div>
            </div>

            {/* Respaldo de Base de Datos & Ficha Técnica */}
            <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Copia de Respaldo & Diagnóstico
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Exportación de datos de seguridad y estado de la plataforma.
                  </p>
                </div>
              </div>

              {/* Tarjeta de Respaldo Inmediato */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">
                    Generar Copia de Respaldo Estructurada (JSON)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Descarga un volcado consolidado de clientes, productos, cuentas financieras, servicios de streaming y tasas para archivo externo.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isDownloadingBackup}
                  className="w-full text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {isDownloadingBackup ? (
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Descargar Respaldo Inmediato (.json)</span>
                </Button>
              </div>

              {/* Ficha Técnica de la Plataforma */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground border-b border-border/40 pb-1.5">
                  <Server className="h-3.5 w-3.5 text-primary" />
                  <span>Ficha Técnica del Entorno</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Plataforma:</span>
                    <p className="font-semibold text-foreground">CASA ERP Hybrid</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versión:</span>
                    <p className="font-semibold text-foreground">v1.0.0 (Release 2026.11)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base de Datos:</span>
                    <p className="font-semibold text-foreground">PostgreSQL (Prisma ORM)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado Backend:</span>
                    <p className="font-semibold text-emerald-500">Conectado / Operativo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
