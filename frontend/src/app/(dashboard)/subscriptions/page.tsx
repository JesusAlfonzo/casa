"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow } from "@/lib/utils";
import {
  type Subscription,
  type Customer,
  type Service,
  type StreamingAccount,
  type SubscriptionStats,
} from "@/types/streaming";
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  Share2,
  Calendar,
  AlertTriangle,
  RotateCw,
  Trash2,
  KeyRound,
  TrendingUp,
  User,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSubscriptionModal } from "@/components/subscriptions/create-subscription-modal";
import { RenewSubscriptionModal } from "@/components/subscriptions/renew-subscription-modal";

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "EXPIRING" | "EXPIRED" | "ACTIVE">("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);

  // Queries
  const {
    data: subsData,
    isLoading: loadingSubs,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["subscriptions-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Subscription[] } | Subscription[]>("/subscriptions?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["subscriptions-stats"],
    queryFn: () => api.get<SubscriptionStats>("/subscriptions/stats").catch(() => null),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Customer[] } | Customer[]>("/customers?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const res = await api.get<{ data: Service[] } | Service[]>("/services");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["streaming-accounts-list"],
    queryFn: async () => {
      const res = await api.get<{ items: StreamingAccount[] } | StreamingAccount[]>("/streaming-accounts?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
      }
    },
  });

  // Delete subscription mutation
  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
    },
  });

  const handleDeleteSub = (sub: Subscription) => {
    if (confirm(`¿Estás seguro de cancelar la suscripción de ${sub.customer?.name}? La pantalla quedará libre para un nuevo cliente.`)) {
      deleteSubMutation.mutate(sub.id);
    }
  };

  const subscriptions = Array.isArray(subsData) ? subsData : [];
  const customers = Array.isArray(customersData) ? customersData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];
  const streamingAccounts = Array.isArray(accountsData) ? accountsData : [];
  const exchangeRate = typeof exchangeRateData === "number" ? exchangeRateData : 50.0;

  const nowTimestamp = useClientNow();

  // Filter subscriptions
  const filteredSubs = subscriptions.filter((sub) => {
    const exp = new Date(sub.expirationDate);
    const daysRemaining = Math.ceil((exp.getTime() - nowTimestamp) / (1000 * 3600 * 24));

    if (statusTab === "EXPIRING" && !(daysRemaining >= 0 && daysRemaining <= 3 && sub.status !== "CANCELLED")) {
      return false;
    }
    if (statusTab === "EXPIRED" && !(daysRemaining < 0 || sub.status === "EXPIRED")) {
      return false;
    }
    if (statusTab === "ACTIVE" && (sub.status !== "ACTIVE" || daysRemaining < 0)) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    if (!term) return true;

    return (
      sub.code.toLowerCase().includes(term) ||
      (sub.customer?.name && sub.customer.name.toLowerCase().includes(term)) ||
      (sub.customer?.phone && sub.customer.phone.includes(term)) ||
      (sub.service?.name && sub.service.name.toLowerCase().includes(term)) ||
      (sub.streamingAccount?.accessEmail && sub.streamingAccount.accessEmail.toLowerCase().includes(term))
    );
  });

  // WhatsApp payment reminder trigger
  const handleSendReminderWhatsApp = (sub: Subscription) => {
    if (!sub.customer?.phone) {
      alert("El cliente no tiene un número de teléfono registrado.");
      return;
    }

    const cleanPhone = sub.customer.phone.replace(/[^0-9]/g, "");
    const price = Number(sub.agreedPrice || 0);
    const priceBs = (price * exchangeRate).toFixed(2);
    const expDateStr = new Date(sub.expirationDate).toLocaleDateString();

    const text =
      `👋 ¡Hola ${sub.customer.name}! Te escribimos de *CASA ERP* para recordarte que tu pantalla de *${sub.service?.name}* vence el *${expDateStr}*.\n\n` +
      `💵 *Monto a renovar:* $${price.toFixed(2)} (Bs. ${priceBs})\n` +
      `🏦 *Métodos de Pago:*\n` +
      `• *Pago Móvil:* Banesco (0134) - 0412-0000000 - V-12345678\n` +
      `• *Zelle:* pagos@erphibrido.com\n` +
      `• *Efectivo / Divisas*\n\n` +
      `Por favor envíanos tu comprobante para mantener tu pantalla activa sin interrupciones. ¡Muchas gracias!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // WhatsApp credentials trigger
  const handleSendCredentialsWhatsApp = (sub: Subscription) => {
    if (!sub.customer?.phone) {
      alert("El cliente no tiene un número de teléfono registrado.");
      return;
    }

    const cleanPhone = sub.customer.phone.replace(/[^0-9]/g, "");
    const expDateStr = new Date(sub.expirationDate).toLocaleDateString();

    const text =
      `🎬 *TUS CREDENCIALES DE STREAMING - CASA ERP*\n\n` +
      `Servicio: *${sub.service?.name}*\n` +
      `Correo: \`${sub.streamingAccount?.accessEmail || "N/A"}\`\n` +
      `Contraseña: \`${sub.streamingAccount?.accessPassword || "N/A"}\`\n` +
      `Pantalla asignada: *Pantalla #${sub.streamingProfile?.slotNumber || 1}*\n` +
      `PIN de perfil: *${sub.streamingProfile?.profilePin || "Sin PIN"}*\n` +
      `Vence el: *${expDateStr}*\n\n` +
      `⚠️ *Importante:* No modifiques la contraseña ni el nombre de otros perfiles para mantener la garantía de tu pantalla. ¡Disfruta tu contenido!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // MRR calculation
  const totalMRR = statsData?.monthlyRecurringRevenue ?? subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((acc, s) => acc + Number(s.agreedPrice || 0), 0);

  const mrrBs = (totalMRR * exchangeRate).toFixed(2);

  const expiringCount = subscriptions.filter((s) => {
    const d = Math.ceil((new Date(s.expirationDate).getTime() - nowTimestamp) / (1000 * 3600 * 24));
    return d >= 0 && d <= 3 && s.status !== "CANCELLED";
  }).length;

  const expiredCount = subscriptions.filter((s) => {
    const d = Math.ceil((new Date(s.expirationDate).getTime() - nowTimestamp) / (1000 * 3600 * 24));
    return d < 0 || s.status === "EXPIRED";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Suscripciones y Cobranza WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestión de renovaciones de clientes, control de fechas de corte y recordatorios en 1 clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/streaming/profiles">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Tv className="h-4 w-4" />
              <span>Ver Pantallas Libres</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs shadow-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Suscripción</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Suscripciones Activas
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold">
              {subscriptions.filter((s) => s.status === "ACTIVE").length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Clientes con pantallas al día
            </p>
          </CardContent>
        </Card>

        {/* Por Vencer (Alerta Prioritaria) */}
        <Card className="border-border shadow-2xs border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-300 font-semibold">
              Por Vencer (≤ 3 Días)
            </CardTitle>
            <div className="rounded-md bg-amber-500/20 p-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {expiringCount}
            </div>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
              Listas para enviar aviso por WhatsApp
            </p>
          </CardContent>
        </Card>

        {/* Vencidas */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Vencidas / En Mora
            </CardTitle>
            <div className="rounded-md bg-destructive/10 p-1.5 text-destructive">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-destructive">
              {expiredCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Requieren renovación o corte
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ingreso Mensual (MRR)
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold">${totalMRR.toFixed(2)}</div>
            {exchangeRate > 1 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                Bs. {mrrBs} / mes
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, teléfono, código o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={statusTab === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusTab("ALL")}
            className="rounded-full text-xs px-2.5"
          >
            Todas ({subscriptions.length})
          </Button>

          <Button
            type="button"
            variant={statusTab === "EXPIRING" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusTab("EXPIRING")}
            className="rounded-full text-xs px-2.5 gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Por Vencer ({expiringCount})</span>
          </Button>

          <Button
            type="button"
            variant={statusTab === "EXPIRED" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusTab("EXPIRED")}
            className="rounded-full text-xs px-2.5 gap-1 text-destructive font-semibold"
          >
            <span>Vencidas ({expiredCount})</span>
          </Button>

          <Button
            type="button"
            variant={statusTab === "ACTIVE" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusTab("ACTIVE")}
            className="rounded-full text-xs px-2.5"
          >
            Al Día
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      {loadingSubs ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          Cargando suscripciones...
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No se encontraron suscripciones
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            {searchTerm
              ? "No hay resultados para la búsqueda ingresada."
              : "Asigna una pantalla a un cliente para comenzar el control de cobros recurrentes."}
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Suscripción</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código / Cliente</TableHead>
                <TableHead>Servicio / Pantalla</TableHead>
                <TableHead>Vencimiento / Estado</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Cobranza WhatsApp</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubs.map((sub) => {
                const exp = new Date(sub.expirationDate);
                const daysRemaining = Math.ceil((exp.getTime() - nowTimestamp) / (1000 * 3600 * 24));
                const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;
                const isExpired = daysRemaining < 0;

                const price = Number(sub.agreedPrice || 0);
                const priceBs = (price * exchangeRate).toFixed(2);

                return (
                  <TableRow
                    key={sub.id}
                    className={
                      isExpired
                        ? "bg-destructive/5"
                        : isExpiringSoon
                          ? "bg-amber-500/5"
                          : ""
                    }
                  >
                    {/* Code & Customer */}
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-[11px] text-muted-foreground">
                          {sub.code}
                        </span>
                        <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{sub.customer?.name} {sub.customer?.lastName || ""}</span>
                        </span>
                        {sub.customer?.phone && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {sub.customer.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Service & Profile Slot */}
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {sub.service?.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>Pantalla #{sub.streamingProfile?.slotNumber || 1}</span>
                          {sub.streamingProfile?.profilePin && (
                            <span className="flex items-center gap-0.5 font-mono text-[10px] text-foreground">
                              <KeyRound className="h-2.5 w-2.5" />
                              {sub.streamingProfile.profilePin}
                            </span>
                          )}
                        </div>
                        {sub.streamingAccount?.accessEmail && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {sub.streamingAccount.accessEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Expiration & Countdown */}
                    <TableCell className="text-xs">
                      <div className="flex flex-col items-start gap-1">
                        <Badge
                          variant={
                            isExpired
                              ? "destructive"
                              : isExpiringSoon
                                ? "outline"
                                : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {isExpired
                            ? `Venció hace ${Math.abs(daysRemaining)}d`
                            : daysRemaining === 0
                              ? "¡Vence hoy!"
                              : daysRemaining === 1
                                ? "¡Vence mañana!"
                                : isExpiringSoon
                                  ? `¡Vence en ${daysRemaining} días!`
                                  : `${daysRemaining} días restantes`}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {exp.toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right text-xs">
                      <div className="font-bold text-foreground">${price.toFixed(2)}</div>
                      {exchangeRate > 1 && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Bs. {priceBs}
                        </div>
                      )}
                    </TableCell>

                    {/* WhatsApp 1-Click Reminder */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handleSendReminderWhatsApp(sub)}
                          className="gap-1 text-[11px] h-7 text-emerald-600 hover:text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
                          title="Enviar aviso de cobro formateado por WhatsApp"
                        >
                          <Share2 className="h-3 w-3" />
                          <span>Aviso Cobro</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleSendCredentialsWhatsApp(sub)}
                          className="h-7 w-7 text-blue-600 hover:text-blue-700"
                          title="Enviar datos de acceso (correo, clave, PIN) por WhatsApp"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Renew */}
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => setRenewSub(sub)}
                          className="gap-1 text-[11px] h-7 font-semibold"
                          title="Renovar suscripción (+30 días)"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Renovar</span>
                        </Button>

                        {/* Delete / Free */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteSub(sub)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Cancelar suscripción y liberar pantalla"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Subscription Modal */}
      <CreateSubscriptionModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        customers={customers}
        services={services}
        streamingAccounts={streamingAccounts}
      />

      {/* Renew Subscription Modal */}
      <RenewSubscriptionModal
        subscription={renewSub}
        open={!!renewSub}
        onOpenChange={(open) => !open && setRenewSub(null)}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
