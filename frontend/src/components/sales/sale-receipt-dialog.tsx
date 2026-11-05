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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  // Unwrap sale in case it comes wrapped as { data: sale } or direct
  const rawSale = sale as any;
  const activeSale: SaleTransaction | null =
    rawSale && typeof rawSale === "object" && "data" in rawSale && rawSale.data
      ? rawSale.data
      : sale;

  // Query fresh sale details if items are missing
  const { data: detailedSale, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["sale-receipt-detail", activeSale?.id],
    queryFn: async () => {
      if (!activeSale?.id) return null;
      const res = await api.get<{ data?: SaleTransaction } | SaleTransaction>(`/sales/${activeSale.id}`);
      if (res && typeof res === "object" && "data" in res && res.data) return res.data;
      return res as SaleTransaction;
    },
    enabled: !!activeSale?.id && open && (!activeSale?.items || activeSale.items.length === 0),
  });

  if (!activeSale) return null;

  const currentSale = detailedSale || activeSale;
  const items = currentSale.items || [];
  const payments = currentSale.payments || [];
  const total = Number(currentSale.total || 0);
  const totalPaid = Number(currentSale.totalPaid || 0);
  const pendingBalance = Math.max(0, total - totalPaid);
  const rate = exchangeRate || 1;
  const totalBs = (total * rate).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!currentSale.customer?.phone) {
      alert("El cliente no tiene un teléfono registrado para compartir.");
      return;
    }

    const cleanPhone = currentSale.customer.phone.replace(/[^0-9]/g, "");
    const itemsText = items.length > 0
      ? items
          .map(
            (it) =>
              `• ${it.product?.name || it.service?.name || it.description || "Ítem"} x${it.quantity} - $${Number(it.subtotal || 0).toFixed(2)}`
          )
          .join("\n")
      : "• Venta general";

    const message = `🧾 *COMPROBANTE DE VENTA - CASA ERP*\n` +
      `N° Comprobante: ${currentSale.documentNumber || currentSale.orderNumber || currentSale.id}\n` +
      `Fecha: ${new Date(currentSale.soldAt).toLocaleString()}\n` +
      `Cliente: ${currentSale.customer.name} ${currentSale.customer.lastName || ""}\n\n` +
      `*DETALLE DE COMPRA:*\n${itemsText}\n\n` +
      `*TOTAL:* $${total.toFixed(2)} (Bs. ${totalBs})\n` +
      `*PAGADO:* $${totalPaid.toFixed(2)}\n` +
      (pendingBalance > 0 ? `*SALDO PENDIENTE:* $${pendingBalance.toFixed(2)}\n` : `*ESTADO:* PAGADO COMPLETAMENTE ✅\n`) +
      `\n¡Gracias por su preferencia!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Comprobante de Venta
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                currentSale.status === "COMPLETED"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : currentSale.status === "PARTIALLY_PAID"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : currentSale.status === "PENDING_PAYMENT"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {currentSale.status === "COMPLETED"
                ? "PAGADA"
                : currentSale.status === "PARTIALLY_PAID"
                  ? "PAGO PARCIAL"
                  : currentSale.status === "PENDING_PAYMENT"
                    ? "POR COBRAR"
                    : currentSale.status === "VOIDED"
                      ? "ANULADA"
                      : currentSale.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable Ticket Area */}
        <div id="receipt-print-area" className="p-5 sm:p-6 space-y-4 text-xs font-mono bg-card overflow-y-auto max-h-[60vh]">
          {/* Header Ticket */}
          <div className="text-center space-y-1 border-b border-dashed border-border pb-3.5">
            <div className="flex items-center justify-center gap-1.5 font-black text-sm tracking-wider text-foreground">
              <Store className="h-4 w-4" />
              <span>CASA ERP • SUITE</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sistema Híbrido de Ventas, Inventario & Streaming
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 text-[11px] pt-1.5 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <strong className="text-foreground">{currentSale.documentNumber || currentSale.orderNumber || currentSale.id}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(currentSale.soldAt).toLocaleDateString()} {new Date(currentSale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="flex justify-between items-center text-[11px] border-b border-dashed border-border pb-2.5">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Cliente:</span>
            </span>
            <span className="font-semibold text-foreground">
              {currentSale.customer
                ? `${currentSale.customer.name} ${currentSale.customer.lastName || ""} ${currentSale.customer.documentId ? `(${currentSale.customer.documentId})` : ""}`
                : "Cliente Mostrador (Consumidor Final)"}
            </span>
          </div>

          {/* Items breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-[11px] text-muted-foreground border-b border-border pb-1">
              <span>Cant. / Descripción</span>
              <span>Subtotal</span>
            </div>

            {isLoadingDetail && items.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Cargando detalle de artículos...</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1 text-center">
                Sin desglose de artículos disponible
              </p>
            ) : (
              items.map((item, idx) => {
                const name =
                  item.product?.name ||
                  item.service?.name ||
                  item.description ||
                  "Artículo";

                return (
                  <div key={idx} className="flex justify-between items-start text-[11px] gap-2">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-semibold text-foreground truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.quantity} x ${Number(item.unitPrice || 0).toFixed(2)}
                        {Number(item.discountAmount || 0) > 0 && ` (Desc. -$${Number(item.discountAmount).toFixed(2)})`}
                      </span>
                    </div>
                    <span className="font-bold text-foreground shrink-0">
                      ${Number(item.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="border-t border-dashed border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Subtotal:</span>
              <span>${Number(currentSale.subtotal || total).toFixed(2)}</span>
            </div>

            {Number(currentSale.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                <span>Descuento global:</span>
                <span>-${Number(currentSale.discountAmount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-extrabold text-foreground border-t border-border pt-1.5">
              <span>TOTAL (USD):</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>

            {rate > 1 && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Total en Bolívares (Tasa {rate.toFixed(2)}):</span>
                <span className="font-semibold font-mono text-foreground">Bs. {totalBs}</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-foreground border-t border-dashed border-border pt-1.5">
              <span>Total Abonado / Pagado:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ${totalPaid.toFixed(2)}
              </span>
            </div>

            {pendingBalance > 0 && (
              <div className="flex justify-between text-xs font-bold text-destructive">
                <span>Saldo Pendiente:</span>
                <span className="font-mono">${pendingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Payments breakdown */}
          {payments.length > 0 && (
            <div className="border-t border-dashed border-border pt-2.5 text-[10px] space-y-1">
              <span className="font-semibold text-muted-foreground">Cobros registrados:</span>
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-muted-foreground">
                  <span>
                    {p.paymentMethod?.name || "Pago"}{" "}
                    {p.reference ? `(Ref: ${p.reference})` : ""}
                  </span>
                  <span className="font-medium text-foreground font-mono">
                    ${Number(p.amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pendingBalance > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Esta venta quedó registrada con saldo pendiente por cobrar.</span>
            </div>
          )}
        </div>

        {/* Footer actions (Pinned with generous padding) */}
        <DialogFooter className="m-0 mx-0 mb-0 p-4 border-t border-border bg-card flex flex-col sm:flex-row gap-2.5">
          {currentSale.customer?.phone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10 rounded-xl h-9"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Enviar WhatsApp</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs rounded-xl h-9"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Ticket</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              if (onNewSale) onNewSale();
            }}
            className="text-xs font-bold rounded-xl h-9 shadow-xs"
          >
            Listo / Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
