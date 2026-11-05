"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow } from "@/lib/utils";
import {
  type NotificationItem,
  type NotificationListResponse,
  type ScanAlertsResponse,
} from "@/types/notification";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Tv,
  Package,
  CreditCard,
  AlertCircle,
  Info,
  ExternalLink,
  MessageCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientNow = useClientNow();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "STREAMING" | "INVENTORY" | "PAYMENT">("ALL");

  // Query notificaciones con autorefresco cada 30 segundos
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationListResponse>("/api/notifications?limit=50"),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const notifications = useMemo(() => data?.items || [], [data?.items]);
  const unreadCount = data?.unreadCount || 0;

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: unreadCount,
      streaming: notifications.filter(
        (i) => i.type === "STREAMING_EXPIRATION" || i.type === "STREAMING_CUTOFF"
      ).length,
      inventory: notifications.filter(
        (i) => i.type === "STOCK_LOW" || i.type === "STOCK_OUT"
      ).length,
      payment: notifications.filter(
        (i) => i.type === "PAYMENT_OVERDUE"
      ).length,
    };
  }, [notifications, unreadCount]);

  // Mutación: Escanear alertas activas
  const scanMutation = useMutation({
    mutationFn: () => api.post<ScanAlertsResponse>("/api/notifications/scan", {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (res.createdCount > 0) {
        toast.info(`Escaneo completado: ${res.createdCount} nueva(s) alerta(s) generadas.`);
      } else {
        toast.success("Escaneo completado: No hay alertas pendientes.");
      }
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Error al escanear alertas");
    },
  });

  // Mutación: Marcar una como leída
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mutación: Marcar todas como leídas
  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/api/notifications/mark-all-read", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas las notificaciones fueron marcadas como leídas");
    },
  });

  // Mutación: Eliminar una notificación
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mutación: Limpiar leídas
  const clearReadMutation = useMutation({
    mutationFn: () => api.delete("/api/notifications/clear-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificaciones leídas eliminadas");
    },
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "UNREAD") return !item.isRead;
      if (filter === "STREAMING") {
        return (
          item.type === "STREAMING_EXPIRATION" ||
          item.type === "STREAMING_CUTOFF"
        );
      }
      if (filter === "INVENTORY") {
        return item.type === "STOCK_LOW" || item.type === "STOCK_OUT";
      }
      if (filter === "PAYMENT") {
        return item.type === "PAYMENT_OVERDUE";
      }
      return true;
    });
  }, [notifications, filter]);

  const handleNavigate = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!clientNow || !dateStr) return "";
    const diffMs = clientNow - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Hace un momento";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      case "HIGH":
        return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "MEDIUM":
        return "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400";
      default:
        return "border-border bg-muted/30 text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string, priority: string) => {
    if (priority === "CRITICAL") return <AlertCircle className="h-4 w-4 text-destructive" />;
    switch (type) {
      case "STREAMING_EXPIRATION":
      case "STREAMING_CUTOFF":
        return <Tv className="h-4 w-4 text-purple-500" />;
      case "STOCK_LOW":
      case "STOCK_OUT":
        return <Package className="h-4 w-4 text-amber-500" />;
      case "PAYMENT_OVERDUE":
        return <CreditCard className="h-4 w-4 text-rose-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Centro de Notificaciones"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in zoom-in-75">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />

      <SheetContent side="right" showCloseButton={false} className="flex h-full w-full flex-col p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold">Notificaciones</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 text-[10px] font-medium px-1.5">
                  {unreadCount} nueva{unreadCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Escanear alertas ahora"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 ${scanMutation.isPending ? "animate-spin text-primary" : ""}`}
                />
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Marcar todas como leídas"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}

              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Cerrar panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2.5 overflow-x-auto pt-3 pb-1.5 px-1 scrollbar-none text-xs">
            {/* Todas */}
            <button
              onClick={() => setFilter("ALL")}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {counts.all > 0 && (
                <span className="absolute -top-1.5 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/15 dark:bg-foreground/20 px-1 text-[9px] font-bold text-foreground border border-background">
                  {counts.all}
                </span>
              )}
              Todas
            </button>

            {/* No leídas */}
            <button
              onClick={() => setFilter("UNREAD")}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "UNREAD"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {counts.unread > 0 && (
                <span className="absolute -top-1.5 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground border border-background animate-in zoom-in-75">
                  {counts.unread}
                </span>
              )}
              No leídas
            </button>

            {/* Streaming */}
            <button
              onClick={() => setFilter("STREAMING")}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "STREAMING"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {counts.streaming > 0 && (
                <span className="absolute -top-1.5 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-background px-1 text-[9px] font-bold">
                  {counts.streaming}
                </span>
              )}
              Streaming
            </button>

            {/* Stock */}
            <button
              onClick={() => setFilter("INVENTORY")}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "INVENTORY"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {counts.inventory > 0 && (
                <span className="absolute -top-1.5 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-background px-1 text-[9px] font-bold">
                  {counts.inventory}
                </span>
              )}
              Stock
            </button>

            {/* Cobranzas */}
            <button
              onClick={() => setFilter("PAYMENT")}
              className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "PAYMENT"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {counts.payment > 0 && (
                <span className="absolute -top-1.5 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-background px-1 text-[9px] font-bold">
                  {counts.payment}
                </span>
              )}
              Cobranzas
            </button>
          </div>
        </SheetHeader>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Cargando notificaciones...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin notificaciones</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                {filter !== "ALL"
                  ? "No se encontraron notificaciones en este filtro."
                  : "Todo está al día en tu negocio. Las alertas importantes aparecerán aquí."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs gap-1.5"
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
              >
                <RefreshCw className="h-3 w-3" />
                Escanear alertas ahora
              </Button>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`group relative rounded-lg border p-3 transition-all ${
                  item.isRead
                    ? "border-border/60 bg-card/60 opacity-80"
                    : "border-border bg-card shadow-xs"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-muted/60">
                      {getTypeIcon(item.type, item.priority)}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-semibold leading-snug cursor-pointer hover:text-primary transition-colors ${
                          !item.isRead ? "text-foreground font-bold" : "text-foreground/90"
                        }`}
                        onClick={() => handleNavigate(item)}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Top-right badges and quick actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${getPriorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>

                    {!item.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(item.id)}
                        title="Marcar como leída"
                        className="text-muted-foreground hover:text-primary p-1 rounded transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      title="Eliminar notificación"
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {item.message}
                </p>

                {/* Action Buttons Row */}
                <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* WhatsApp Action button if url available */}
                    {item.metadata?.whatsappUrl && (
                      <a
                        href={item.metadata.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (!item.isRead) markReadMutation.mutate(item.id);
                        }}
                      >
                        <Button
                          size="sm"
                          className="h-6 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 font-medium"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Enviar WhatsApp
                        </Button>
                      </a>
                    )}

                    {/* Navigation Link */}
                    {item.link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 gap-1 text-[11px] px-2 text-foreground/80 hover:text-foreground"
                        onClick={() => handleNavigate(item)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver detalle
                      </Button>
                    )}
                  </div>

                  {!item.isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.some((n) => n.isRead) && (
          <div className="border-t p-3 bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
            <span>{notifications.length} notificaciones en total</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpiar leídas
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
