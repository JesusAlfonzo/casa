"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow, cn } from "@/lib/utils";
import {
  type Customer,
  type CustomerWithDetails,
  type CustomerSubscriptionDetail,
} from "@/types/customer";
import { type SaleTransaction } from "@/types/pos";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Mail,
  MapPin,
  IdCard,
  MessageCircle,
  Edit,
  ShoppingCart,
  Tv,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Send,
  Eye,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface CustomerDetailSheetProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditCustomer: (customer: Customer) => void;
  onViewReceipt?: (sale: SaleTransaction) => void;
  exchangeRate?: number;
}

export function CustomerDetailSheet({
  customerId,
  open,
  onOpenChange,
  onEditCustomer,
  onViewReceipt,
  exchangeRate = 1,
}: CustomerDetailSheetProps) {
  const nowTimestamp = useClientNow();

  const { data: customerRes, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return api.get<{ success: boolean; data: CustomerWithDetails }>(
        `/api/customers/${customerId}`
      );
    },
    enabled: Boolean(customerId && open),
  });

  const { data: salesRes, isLoading: isLoadingSales } = useQuery({
    queryKey: ["customer-sales", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return api.get<{
        success: boolean;
        items: SaleTransaction[];
        total: number;
      }>(`/api/sales?customerId=${customerId}&limit=50`);
    },
    enabled: Boolean(customerId && open),
  });

  const customer = customerRes?.data;
  const sales = salesRes?.items || [];

  const [activeTab, setActiveTab] = useState<
    "financial" | "streaming" | "sales" | "info"
  >("financial");
  const [salesPage, setSalesPage] = useState(1);
  const salesLimit = 5;
  const salesTotalPages = Math.ceil(sales.length / salesLimit) || 1;
  const paginatedSales = sales.slice(
    (salesPage - 1) * salesLimit,
    salesPage * salesLimit
  );

  const subscriptions = customer?.subscriptions || [];
  const subsCount = subscriptions.length;
  const salesCount = sales.length;

  const tabItems = [
    {
      id: "financial" as const,
      label: "Saldo y pagos",
      icon: DollarSign,
      badge: undefined,
    },
    {
      id: "streaming" as const,
      label: "Streaming",
      icon: Tv,
      badge: subsCount,
    },
    {
      id: "sales" as const,
      label: "Compras",
      icon: ShoppingCart,
      badge: salesCount,
    },
    {
      id: "info" as const,
      label: "Datos",
      icon: FileText,
      badge: undefined,
    },
  ];

  // Calcular totales excluyendo ventas anuladas
  const validSales = sales.filter((s) => s.status !== "VOIDED");
  const totalInvoicedUSD = validSales.reduce(
    (acc, s) => acc + Number(s.total || 0),
    0
  );
  const totalPaidUSD = validSales.reduce(
    (acc, s) => acc + Number(s.totalCollected ?? s.totalPaid ?? 0),
    0
  );
  const totalDebtUSD = Math.max(0, totalInvoicedUSD - totalPaidUSD);
  const totalInvoicedBs = (totalInvoicedUSD * exchangeRate).toFixed(2);
  const totalDebtBs = (totalDebtUSD * exchangeRate).toFixed(2);

  const getInitials = (name?: string, lastName?: string | null) => {
    const first = name ? name[0].toUpperCase() : "C";
    const last = lastName ? lastName[0].toUpperCase() : "";
    return `${first}${last}`;
  };

  const handleSendWhatsAppChat = () => {
    if (!customer?.phone) return;
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const text = `Hola ${customer.name}, ¿cómo estás? Te escribimos para atenderte.`;
    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleSendDebtReminderWhatsApp = () => {
    if (!customer?.phone || totalDebtUSD <= 0.01) return;
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const text =
      `Hola ${customer.name}, te recordamos tu saldo pendiente:\n\n` +
      `📌 *Pendiente por pagar:* $${totalDebtUSD.toFixed(2)} (Bs. ${totalDebtBs})\n\n` +
      `Puedes pagar por Pago Móvil, Transferencia, Zinli, Binance o Efectivo.\n` +
      `Avísanos cuando realices el pago. ¡Muchas gracias!`;
    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleSendSubscriptionCredentials = (
    sub: CustomerSubscriptionDetail
  ) => {
    if (!customer?.phone) return;
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const expDateStr = new Date(sub.expirationDate).toLocaleDateString("es-VE");
    const text =
      `🎬 *ACCESOS DE STREAMING*\n\n` +
      `Servicio: *${sub.service?.name}*\n` +
      `Correo: ${sub.streamingAccount?.accessEmail || "N/A"}\n` +
      `Pantalla: *#${sub.streamingProfile?.slotNumber || 1}*\n` +
      `PIN: *${sub.streamingProfile?.profilePin || "Sin PIN"}*\n` +
      `Vence el: *${expDateStr}*\n\n` +
      `Por favor no cambies la contraseña ni otros perfiles. ¡Gracias!`;
    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0"
      >
        {isLoadingCustomer && !customer ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !customer ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No se encontró la información del cliente.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Encabezado del cliente */}
            <div className="border-b border-border bg-card p-6 sm:px-8 pr-14">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-14 w-14 border-2 border-primary/20 bg-primary/10 text-primary font-bold text-lg shrink-0">
                    <AvatarFallback>
                      {getInitials(customer.name, customer.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-xl font-bold text-foreground truncate">
                        {customer.name} {customer.lastName || ""}
                      </SheetTitle>
                      {customer.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs shrink-0"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {customer.documentId && (
                        <span className="flex items-center gap-1 font-mono">
                          <IdCard className="h-4 w-4" />
                          {customer.documentId}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    className="gap-2 text-sm h-10 px-4"
                    onClick={() => onEditCustomer(customer)}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                  </Button>
                  {customer.phone && (
                    <Button
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10 px-4 font-medium"
                      onClick={handleSendWhatsAppChat}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Aviso de saldo pendiente */}
              {totalDebtUSD > 0.01 && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Tiene un saldo pendiente de{" "}
                      <strong>${totalDebtUSD.toFixed(2)}</strong> (Bs.{" "}
                      {totalDebtBs}).
                    </span>
                  </div>
                  {customer.phone && (
                    <Button
                      variant="outline"
                      className="h-9 px-3.5 border-amber-500/40 bg-background text-sm gap-1.5 shrink-0"
                      onClick={handleSendDebtReminderWhatsApp}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Recordar por WhatsApp</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Navegación interna */}
            <div className="flex-1 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 select-none">
                {tabItems.map((item) => {
                  const isSelected = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer outline-none",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold truncate">
                          {item.label}
                        </span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className="h-5 px-1.5 text-xs shrink-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pestaña: Saldo y pagos */}
              {activeTab === "financial" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-5 space-y-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          Total comprado
                        </span>
                        <div className="text-2xl font-bold font-mono text-foreground">
                          ${totalInvoicedUSD.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          Bs. {totalInvoicedBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-5 space-y-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          Total pagado
                        </span>
                        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ${totalPaidUSD.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          Bs. {(totalPaidUSD * exchangeRate).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-5 space-y-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Pendiente por pagar
                        </span>
                        <div
                          className={`text-2xl font-bold font-mono ${
                            totalDebtUSD > 0.01
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          ${totalDebtUSD.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          Bs. {totalDebtBs}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Acceso rápido a Ventas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-semibold text-foreground">
                        Registrar nueva venta
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Ve al módulo de ventas para cobrar productos o servicios.
                      </p>
                    </div>
                    <Link
                      href="/sales"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Ir a Ventas</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Pestaña: Streaming */}
              {activeTab === "streaming" && (
                <div className="space-y-4">
                  {customer.subscriptions &&
                  customer.subscriptions.length > 0 ? (
                    <div className="space-y-3">
                      {customer.subscriptions.map((sub) => {
                        const expDate = new Date(sub.expirationDate);
                        const daysLeft = Math.ceil(
                          (expDate.getTime() - nowTimestamp) /
                            (1000 * 3600 * 24)
                        );

                        return (
                          <div
                            key={sub.id}
                            className="rounded-xl border border-border bg-card p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Tv className="h-4 w-4 text-purple-500 shrink-0" />
                                  <span className="font-semibold text-base text-foreground">
                                    {sub.service?.name || "Servicio Streaming"}
                                  </span>
                                  {daysLeft <= 0 ? (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Vencida
                                    </Badge>
                                  ) : daysLeft <= 3 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs"
                                    >
                                      Vence en {daysLeft} días
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs"
                                    >
                                      Al día ({daysLeft} días)
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  Cuenta:{" "}
                                  <span className="font-mono text-foreground font-medium">
                                    {sub.streamingAccount?.accessEmail || "N/A"}
                                  </span>
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-bold font-mono text-foreground">
                                  ${Number(sub.agreedPrice || 0).toFixed(2)}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {sub.billingPeriod}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <span>
                                  Pantalla:{" "}
                                  <strong>
                                    #{sub.streamingProfile?.slotNumber || 1} (
                                    {sub.streamingProfile?.profileName ||
                                      "Perfil"}
                                    )
                                  </strong>
                                </span>
                                {sub.streamingProfile?.profilePin && (
                                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                                    <KeyRound className="h-3.5 w-3.5" />
                                    PIN: {sub.streamingProfile.profilePin}
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Vence: {expDate.toLocaleDateString("es-VE")}
                              </span>
                            </div>

                            {customer.phone && (
                              <div className="flex justify-end pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 px-3.5 gap-2 text-sm"
                                  onClick={() =>
                                    handleSendSubscriptionCredentials(sub)
                                  }
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Enviar accesos por WhatsApp</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                      <Tv className="mx-auto h-9 w-9 text-muted-foreground" />
                      <p className="text-base font-medium text-foreground">
                        Sin pantallas de streaming
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Este cliente todavía no tiene suscripciones asignadas.
                      </p>
                      <Link
                        href="/subscriptions"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 h-10 text-sm font-medium hover:bg-muted transition-colors mt-2"
                      >
                        Asignar pantalla
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña: Compras */}
              {activeTab === "sales" && (
                <div className="space-y-4">
                  {isLoadingSales ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : sales.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-sm font-semibold">
                              Recibo
                            </TableHead>
                            <TableHead className="text-sm font-semibold">
                              Fecha
                            </TableHead>
                            <TableHead className="text-sm font-semibold">
                              Total
                            </TableHead>
                            <TableHead className="text-sm font-semibold">
                              Estado
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold">
                              Ver
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-sm font-semibold">
                                {sale.documentNumber ||
                                  sale.orderNumber ||
                                  sale.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(sale.soldAt).toLocaleDateString(
                                  "es-VE"
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-mono font-medium">
                                ${Number(sale.total || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {sale.status === "COMPLETED" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs"
                                  >
                                    Pagada
                                  </Badge>
                                ) : sale.status === "PARTIALLY_PAID" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs"
                                  >
                                    Abono parcial
                                  </Badge>
                                ) : sale.status === "VOIDED" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-destructive/30 bg-destructive/10 text-destructive text-xs"
                                  >
                                    Anulada
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-xs"
                                  >
                                    Por cobrar
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {onViewReceipt && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9"
                                    onClick={() => onViewReceipt(sale)}
                                    title="Ver recibo"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {salesTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
                          <span className="text-xs text-muted-foreground">
                            Página {salesPage} de {salesTotalPages} (
                            {sales.length} compras)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSalesPage((p) => Math.max(p - 1, 1))
                              }
                              disabled={salesPage <= 1}
                              className="h-8 px-2.5 text-xs"
                            >
                              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                              Ant.
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSalesPage((p) =>
                                  Math.min(p + 1, salesTotalPages)
                                )
                              }
                              disabled={salesPage >= salesTotalPages}
                              className="h-8 px-2.5 text-xs"
                            >
                              Sig.
                              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                      <ShoppingCart className="mx-auto h-9 w-9 text-muted-foreground" />
                      <p className="text-base font-medium text-foreground">
                        Sin compras registradas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Este cliente todavía no tiene compras en el historial.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña: Datos */}
              {activeTab === "info" && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-5 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <IdCard className="h-4 w-4" />
                        Cédula
                      </span>
                      <p className="font-semibold text-foreground">
                        {customer.documentId || "No registrada"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <Phone className="h-4 w-4" />
                        Teléfono / WhatsApp
                      </span>
                      <p className="font-semibold text-foreground">
                        {customer.phone || "No registrado"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Mail className="h-4 w-4" />
                      Correo electrónico
                    </span>
                    <p className="font-semibold text-foreground">
                      {customer.email || "No registrado"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <MapPin className="h-4 w-4" />
                      Dirección
                    </span>
                    <p className="font-semibold text-foreground">
                      {customer.address || "No especificada"}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <FileText className="h-4 w-4" />
                      Notas
                    </span>
                    <p className="rounded-lg bg-muted/40 p-3 text-foreground leading-relaxed">
                      {customer.notes || "Sin notas adicionales."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Cliente desde el{" "}
                      {new Date(customer.createdAt).toLocaleDateString("es-VE")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
