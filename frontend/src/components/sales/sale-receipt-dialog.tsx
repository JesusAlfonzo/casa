"use client";

import React from "react";
import { type SaleTransaction } from "@/types/pos";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Printer,
  Share2,
  CheckCircle2,
  Store,
  Calendar,
  User,
  Hash,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SaleReceiptDialogProps {
  sale: SaleTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewSale?: () => void;
  exchangeRate?: number;
}

export function SaleReceiptDialog({
  sale,
  open,
  onOpenChange,
  onNewSale,
  exchangeRate,
}: SaleReceiptDialogProps) {
  const activeSale: SaleTransaction | null =
    sale &&
    typeof sale === "object" &&
    "data" in sale &&
    (sale as { data?: SaleTransaction }).data
      ? ((sale as { data?: SaleTransaction }).data as SaleTransaction)
      : sale;

  const { data: detailedSale, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["sale-receipt-detail", activeSale?.id],
    queryFn: async () => {
      if (!activeSale?.id) return null;
      const res = await api.get<{ data?: SaleTransaction } | SaleTransaction>(
        `/sales/${activeSale.id}`
      );
      if (res && typeof res === "object" && "data" in res && res.data) {
        return res.data;
      }
      return res as SaleTransaction;
    },
    enabled:
      !!activeSale?.id &&
      open &&
      (!activeSale?.items || activeSale.items.length === 0),
  });

  if (!activeSale) return null;

  const currentSale = detailedSale || activeSale;
  const items = currentSale.items || [];
  const payments = currentSale.payments || [];
  const total = Number(currentSale.total || 0);
  const totalPaid = Number(
    currentSale.totalCollected ?? currentSale.totalPaid ?? 0
  );
  const pendingBalance = Math.max(0, total - totalPaid);
  const rate = exchangeRate || 1;
  const totalBs = (total * rate).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!currentSale.customer?.phone) {
      toast.error("Este cliente no tiene teléfono registrado para WhatsApp.");
      return;
    }

    const cleanPhone = currentSale.customer.phone.replace(/[^0-9]/g, "");
    const itemsText =
      items.length > 0
        ? items
            .map(
              (it) =>
                `• ${it.product?.name || it.service?.name || it.description || "Producto"} x${it.quantity} - $${Number(it.subtotal || 0).toFixed(2)}`
            )
            .join("\n")
        : "• Venta general";

    const message =
      `🧾 *RECIBO DE COMPRA*\n` +
      `Recibo N°: ${currentSale.documentNumber || currentSale.orderNumber || currentSale.id}\n` +
      `Fecha: ${new Date(currentSale.soldAt).toLocaleString("es-VE")}\n` +
      `Cliente: ${currentSale.customer.name} ${currentSale.customer.lastName || ""}\n\n` +
      `*DETALLE:*\n${itemsText}\n\n` +
      `*TOTAL:* $${total.toFixed(2)}${rate > 1 ? ` (Bs. ${totalBs})` : ""}\n` +
      `*PAGADO:* $${totalPaid.toFixed(2)}\n` +
      (pendingBalance > 0.01
        ? `*PENDIENTE:* $${pendingBalance.toFixed(2)}\n`
        : `*ESTADO:* Pagado completo ✅\n`) +
      `\n¡Gracias por su compra!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const statusLabel =
    currentSale.status === "COMPLETED"
      ? "Pagada"
      : currentSale.status === "PARTIALLY_PAID"
        ? "Abono parcial"
        : currentSale.status === "PENDING_PAYMENT"
          ? "Por cobrar"
          : currentSale.status === "VOIDED"
            ? "Anulada"
            : currentSale.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        {/* Encabezado con espacio suficiente para el botón cerrar */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground truncate">
                Recibo de venta
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                currentSale.status === "COMPLETED"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : currentSale.status === "PARTIALLY_PAID"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : currentSale.status === "PENDING_PAYMENT"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {statusLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* Área imprimible del recibo */}
        <div
          id="receipt-print-area"
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 text-sm bg-card"
        >
          {/* Cabecera del recibo */}
          <div className="text-center space-y-1.5 border-b border-dashed border-border pb-4">
            <div className="flex items-center justify-center gap-2 font-bold text-base text-foreground">
              <Store className="h-4 w-4 text-primary" />
              <span>Ventas de Casa</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono">
                <Hash className="h-3.5 w-3.5" />
                <strong className="text-foreground">
                  {currentSale.documentNumber ||
                    currentSale.orderNumber ||
                    currentSale.id}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(currentSale.soldAt).toLocaleDateString("es-VE")}{" "}
                {new Date(currentSale.soldAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Cliente */}
          <div className="flex justify-between items-center gap-3 text-sm border-b border-dashed border-border pb-3">
            <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <User className="h-4 w-4" />
              <span>Cliente:</span>
            </span>
            <span className="font-medium text-foreground text-right truncate">
              {currentSale.customer
                ? `${currentSale.customer.name} ${currentSale.customer.lastName || ""}`.trim()
                : "Cliente general"}
            </span>
          </div>

          {/* Artículos */}
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground border-b border-border pb-1.5">
              <span>Artículo</span>
              <span>Subtotal</span>
            </div>

            {isLoadingDetail && items.length === 0 ? (
              <div className="py-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Cargando artículos...</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2 text-center">
                Sin detalle de artículos
              </p>
            ) : (
              items.map((item, idx) => {
                const name =
                  item.product?.name ||
                  item.service?.name ||
                  item.description ||
                  "Artículo";

                return (
                  <div
                    key={idx}
                    className="flex justify-between items-start gap-3 text-sm"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} × ${Number(item.unitPrice || 0).toFixed(2)}
                        {Number(item.discountAmount || 0) > 0 &&
                          ` (Desc. -$${Number(item.discountAmount).toFixed(2)})`}
                      </span>
                    </div>
                    <span className="font-semibold font-mono text-foreground shrink-0">
                      ${Number(item.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Totales */}
          <div className="border-t border-dashed border-border pt-3.5 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">
                ${Number(currentSale.subtotal || total).toFixed(2)}
              </span>
            </div>

            {Number(currentSale.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>Descuento</span>
                <span className="font-mono">
                  -${Number(currentSale.discountAmount).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2">
              <span>Total</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>

            {rate > 1 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>En bolívares (tasa {rate.toFixed(2)})</span>
                <span className="font-medium font-mono text-foreground">
                  Bs. {totalBs}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm text-foreground border-t border-dashed border-border pt-2">
              <span>Pagado</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                ${totalPaid.toFixed(2)}
              </span>
            </div>

            {pendingBalance > 0.01 && (
              <div className="flex justify-between text-sm font-semibold text-destructive">
                <span>Falta por pagar</span>
                <span className="font-mono">${pendingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Pagos registrados */}
          {payments.length > 0 && (
            <div className="border-t border-dashed border-border pt-3 text-xs space-y-1.5">
              <span className="font-semibold text-muted-foreground block">
                Pagos registrados:
              </span>
              {payments.map((p, idx) => {
                const num = Number(p.amount || 0).toFixed(2);
                const code = p.currency?.code?.toUpperCase();
                const hint = `${p.paymentMethod?.name || ""} ${p.financialAccount?.name || ""}`.toLowerCase();
                const formattedAmount =
                  code === "VES"
                    ? `Bs. ${num}`
                    : code === "EUR"
                      ? `€${num}`
                      : code === "USDT"
                        ? `${num} USDT`
                        : code === "USD"
                          ? `$${num}`
                          : hint.includes("bs") ||
                              hint.includes("ves") ||
                              hint.includes("móvil") ||
                              hint.includes("movil") ||
                              hint.includes("transferencia")
                            ? `Bs. ${num}`
                            : hint.includes("eur") || hint.includes("euro")
                              ? `€${num}`
                              : hint.includes("binance") || hint.includes("usdt")
                                ? `${num} USDT`
                                : `$${num}`;

                return (
                  <div
                    key={idx}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span>
                      {p.paymentMethod?.name || "Pago"}{" "}
                      {p.reference ? `(Ref: ${p.reference})` : ""}
                    </span>
                    <span className="font-medium text-foreground font-mono">
                      {formattedAmount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {pendingBalance > 0.01 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Esta venta todavía tiene un saldo pendiente por cobrar.</span>
            </div>
          )}
        </div>

        {/* Pie fijo */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {currentSale.customer?.phone && (
            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsAppShare}
              className="h-10 px-4 text-sm gap-2 text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="h-10 px-4 text-sm gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              if (onNewSale) onNewSale();
            }}
            className="h-10 px-5 text-sm font-medium"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
