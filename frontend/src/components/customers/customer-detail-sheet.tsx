"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow } from "@/lib/utils";
import {
  type Customer,
  type CustomerWithDetails,
  type CustomerSubscriptionDetail,
} from "@/types/customer";
import { type SaleTransaction } from "@/types/pos";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Clock,
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

  // Fetch full customer details including active subscriptions
  const {
    data: customerRes,
    isLoading: isLoadingCustomer,
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      return api.get<{ success: boolean; data: CustomerWithDetails }>(
        `/api/customers/${customerId}`
      );
    },
    enabled: Boolean(customerId && open),
  });

  // Fetch sales history for this customer
  const {
    data: salesRes,
    isLoading: isLoadingSales,
  } = useQuery({
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

  // Calculate financial totals
  const totalInvoicedUSD = sales.reduce(
    (acc, s) => acc + Number(s.total || 0),
    0
  );
  const totalPaidUSD = sales.reduce(
    (acc, s) => acc + Number(s.totalPaid || 0),
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
    const text = `¡Hola ${customer.name}! Te contactamos de CASA ERP. ¿Cómo podemos ayudarte hoy?`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendDebtReminderWhatsApp = () => {
    if (!customer?.phone || totalDebtUSD <= 0) return;
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const text =
      `👋 ¡Hola ${customer.name}! Te escribimos de *CASA ERP* para recordarte tu estado de cuenta actual:\n\n` +
      `📌 *Saldo pendiente por pagar:* $${totalDebtUSD.toFixed(2)} (Bs. ${totalDebtBs})\n\n` +
      `🏦 *Cuentas Disponibles:*\n` +
      `• *Pago Móvil:* Banesco (0134) - 0412-0000000 - V-12345678\n` +
      `• *Zelle:* pagos@erphibrido.com\n` +
      `• *Efectivo en Tienda*\n\n` +
      `Por favor indícanos o envíanos tu comprobante cuando realices tu abono. ¡Muchas gracias!`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendSubscriptionCredentials = (sub: CustomerSubscriptionDetail) => {
    if (!customer?.phone) return;
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const expDateStr = new Date(sub.expirationDate).toLocaleDateString();
    const text =
      `🎬 *CREDENCIALES STREAMING - CASA ERP*\n\n` +
      `Servicio: *${sub.service?.name}*\n` +
      `Correo: \`${sub.streamingAccount?.accessEmail || "N/A"}\`\n` +
      `Pantalla asignada: *Pantalla #${sub.streamingProfile?.slotNumber || 1}*\n` +
      `PIN de perfil: *${sub.streamingProfile?.profilePin || "Sin PIN"}*\n` +
      `Vence el: *${expDateStr}*\n\n` +
      `⚠️ *Importante:* Recuerda no modificar datos de la cuenta maestra ni otros perfiles.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0"
      >
        {isLoadingCustomer && !customer ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !customer ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No se encontró la información del cliente.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header / Hero */}
            <div className="border-b border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20 bg-primary/10 text-primary font-bold text-lg">
                    <AvatarFallback>
                      {getInitials(customer.name, customer.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-xl font-bold text-foreground">
                        {customer.name} {customer.lastName || ""}
                      </SheetTitle>
                      {customer.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted bg-muted text-muted-foreground text-xs"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {customer.documentId && (
                        <span className="flex items-center gap-1">
                          <IdCard className="h-3.5 w-3.5" />
                          {customer.documentId}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => onEditCustomer(customer)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  {customer.phone && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={handleSendWhatsAppChat}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              {/* Debt Alert if any */}
              {totalDebtUSD > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Este cliente tiene un saldo pendiente de{" "}
                      <strong>${totalDebtUSD.toFixed(2)} USD</strong> (Bs. {totalDebtBs}).
                    </span>
                  </div>
                  {customer.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-amber-500/40 bg-white/50 dark:bg-card text-xs hover:bg-amber-100 dark:hover:bg-amber-950/50"
                      onClick={handleSendDebtReminderWhatsApp}
                    >
                      <Send className="mr-1 h-3 w-3" />
                      Cobrar por WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Content Tabs */}
            <div className="flex-1 p-6">
              <Tabs defaultValue="financial" className="w-full space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="financial" className="text-xs">
                    Finanzas & POS
                  </TabsTrigger>
                  <TabsTrigger value="streaming" className="text-xs">
                    Streaming ({customer.subscriptions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs">
                    Ventas ({sales.length})
                  </TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">
                    Detalles
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Resumen Financiero */}
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Card className="shadow-xs">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                          Total Facturado
                        </span>
                        <div className="text-lg font-bold text-foreground">
                          ${totalInvoicedUSD.toFixed(2)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bs. {totalInvoicedBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                          Total Abonado
                        </span>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ${totalPaidUSD.toFixed(2)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bs. {(totalPaidUSD * exchangeRate).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs col-span-2 sm:col-span-1">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          Saldo Deudor
                        </span>
                        <div
                          className={`text-lg font-bold ${
                            totalDebtUSD > 0
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          ${totalDebtUSD.toFixed(2)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bs. {totalDebtBs}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* POS Shortcut */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-semibold text-foreground">
                        Nueva Compra en POS
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Inicia una venta directa asignando automáticamente a este cliente.
                      </p>
                    </div>
                    <Link
                      href="/sales"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Ir al POS
                    </Link>
                  </div>
                </TabsContent>

                {/* Tab: Streaming 360° */}
                <TabsContent value="streaming" className="space-y-4">
                  {customer.subscriptions && customer.subscriptions.length > 0 ? (
                    <div className="space-y-3">
                      {customer.subscriptions.map((sub) => {
                        const expDate = new Date(sub.expirationDate);
                        const daysLeft = Math.ceil(
                          (expDate.getTime() - nowTimestamp) / (1000 * 3600 * 24)
                        );

                        return (
                          <div
                            key={sub.id}
                            className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Tv className="h-4 w-4 text-purple-500" />
                                  <span className="font-semibold text-sm text-foreground">
                                    {sub.service?.name || "Servicio Streaming"}
                                  </span>
                                  {daysLeft <= 0 ? (
                                    <Badge variant="destructive" className="text-[10px]">
                                      Vencida
                                    </Badge>
                                  ) : daysLeft <= 3 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]"
                                    >
                                      Vence en {daysLeft}d
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]"
                                    >
                                      Al día ({daysLeft}d)
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Cuenta:{" "}
                                  <span className="font-mono text-foreground font-medium">
                                    {sub.streamingAccount?.accessEmail || "N/A"}
                                  </span>
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-sm font-bold text-foreground">
                                  ${Number(sub.agreedPrice || 0).toFixed(2)}
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  {sub.billingPeriod}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
                              <div className="flex items-center gap-3">
                                <span>
                                  Pantalla:{" "}
                                  <strong>
                                    #{sub.streamingProfile?.slotNumber || 1} (
                                    {sub.streamingProfile?.profileName || "Perfil"})
                                  </strong>
                                </span>
                                {sub.streamingProfile?.profilePin && (
                                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                                    <KeyRound className="h-3 w-3" />
                                    PIN: {sub.streamingProfile.profilePin}
                                  </span>
                                )}
                              </div>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Corte: {expDate.toLocaleDateString()}
                              </span>
                            </div>

                            {customer.phone && (
                              <div className="flex justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 text-xs"
                                  onClick={() => handleSendSubscriptionCredentials(sub)}
                                >
                                  <Send className="h-3 w-3" />
                                  Enviar Credenciales
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
                      <Tv className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        Sin suscripciones activas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Este cliente aún no tiene pantallas de streaming asignadas.
                      </p>
                      <Link
                        href="/subscriptions"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors mt-2"
                      >
                        Asignar Pantalla
                      </Link>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Historial de Ventas */}
                <TabsContent value="sales" className="space-y-4">
                  {isLoadingSales ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : sales.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Comprobante</TableHead>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">Total</TableHead>
                            <TableHead className="text-xs">Estado</TableHead>
                            <TableHead className="text-right text-xs">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-xs font-semibold">
                                {sale.documentNumber || sale.orderNumber || sale.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(sale.soldAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                ${Number(sale.total || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {sale.status === "COMPLETED" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]"
                                  >
                                    Pagado
                                  </Badge>
                                ) : sale.status === "PARTIALLY_PAID" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]"
                                  >
                                    Parcial
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-red-500/30 bg-red-500/10 text-red-600 text-[10px]"
                                  >
                                    Pendiente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {onViewReceipt && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onViewReceipt(sale)}
                                    title="Ver Recibo Térmico"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
                      <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        Sin compras registradas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        El cliente no tiene órdenes de compra en el historial de facturación.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Detalles & Notas */}
                <TabsContent value="info" className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium">
                          <IdCard className="h-3.5 w-3.5" />
                          Documento de Identidad:
                        </span>
                        <p className="font-semibold text-foreground">
                          {customer.documentId || "No especificado"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium">
                          <Phone className="h-3.5 w-3.5" />
                          Teléfono:
                        </span>
                        <p className="font-semibold text-foreground">
                          {customer.phone || "No registrado"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Mail className="h-3.5 w-3.5" />
                        Correo Electrónico:
                      </span>
                      <p className="font-semibold text-foreground">
                        {customer.email || "No registrado"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="h-3.5 w-3.5" />
                        Dirección:
                      </span>
                      <p className="font-semibold text-foreground">
                        {customer.address || "No especificada"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <FileText className="h-3.5 w-3.5" />
                        Notas u Observaciones:
                      </span>
                      <p className="rounded-md bg-muted/50 p-2.5 text-foreground leading-relaxed">
                        {customer.notes || "Sin observaciones adicionales."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registrado el: {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ID: {customer.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
