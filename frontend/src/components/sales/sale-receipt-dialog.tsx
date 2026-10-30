"use client";

import React from "react";
import { type SaleTransaction } from "@/types/pos";
import { Printer, Share2, CheckCircle2, Store, Calendar, User, Hash, AlertCircle } from "lucide-react";
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
  if (!sale) return null;

  const total = Number(sale.total || 0);
  const totalPaid = Number(sale.totalPaid || 0);
  const pendingBalance = Math.max(0, total - totalPaid);
  const rate = exchangeRate || 1;
  const totalBs = (total * rate).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!sale.customer?.phone) {
      alert("El cliente no tiene un teléfono registrado para compartir.");
      return;
    }

    const cleanPhone = sale.customer.phone.replace(/[^0-9]/g, "");
    const itemsText = sale.items
      .map(
        (it) =>
          `• ${it.product?.name || it.service?.name || it.description || "Ítem"} x${it.quantity} - $${Number(it.subtotal).toFixed(2)}`
      )
      .join("\n");

    const message = `🧾 *COMPROBANTE DE VENTA - CASA ERP*\n` +
      `N° Orden: ${sale.documentNumber || sale.orderNumber || sale.id}\n` +
      `Fecha: ${new Date(sale.soldAt).toLocaleString()}\n` +
      `Cliente: ${sale.customer.name} ${sale.customer.lastName || ""}\n\n` +
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-base font-semibold">
                Comprobante de Venta
              </DialogTitle>
            </div>
            <Badge
              variant={
                sale.status === "COMPLETED"
                  ? "secondary"
                  : sale.status === "PARTIALLY_PAID" || sale.status === "PENDING_PAYMENT"
                    ? "outline"
                    : "destructive"
              }
              className="text-[10px]"
            >
              {sale.status === "COMPLETED"
                ? "PAGADA"
                : sale.status === "PARTIALLY_PAID"
                  ? "PAGO PARCIAL"
                  : sale.status === "PENDING_PAYMENT"
                    ? "POR COBRAR"
                    : sale.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable Ticket Area */}
        <div id="receipt-print-area" className="p-5 space-y-4 text-xs font-mono bg-card">
          {/* Header Ticket */}
          <div className="text-center space-y-1 border-b border-dashed border-border pb-3">
            <div className="flex items-center justify-center gap-1.5 font-bold text-sm tracking-wider">
              <Store className="h-4 w-4" />
              <span>CASA ERP • SUITE</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sistema Híbrido de Ventas, Inventario & Streaming
            </p>
            <div className="flex justify-center items-center gap-3 text-[11px] pt-1 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <strong className="text-foreground">{sale.documentNumber || sale.orderNumber || sale.id}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(sale.soldAt).toLocaleDateString()} {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="flex justify-between items-center text-[11px] border-b border-dashed border-border pb-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Cliente:</span>
            </span>
            <span className="font-semibold text-foreground">
              {sale.customer
                ? `${sale.customer.name} ${sale.customer.lastName || ""} ${sale.customer.documentId ? `(${sale.customer.documentId})` : ""}`
                : "Cliente Mostrador"}
            </span>
          </div>

          {/* Items breakdown */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-[11px] text-muted-foreground border-b pb-1">
              <span>Cant. / Descripción</span>
              <span>Subtotal</span>
            </div>
            {sale.items.map((item, idx) => {
              const name =
                item.product?.name ||
                item.service?.name ||
                item.description ||
                "Artículo";

              return (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex flex-col max-w-[240px]">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.quantity} x ${Number(item.unitPrice).toFixed(2)}
                      {Number(item.discountAmount) > 0 && ` (Desc. -$${Number(item.discountAmount).toFixed(2)})`}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    ${Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-border pt-2 space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Subtotal:</span>
              <span>${Number(sale.subtotal).toFixed(2)}</span>
            </div>

            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                <span>Descuento global:</span>
                <span>-${Number(sale.discountAmount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-foreground border-t pt-1">
              <span>TOTAL (USD):</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {rate > 1 && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Total en Bolívares (Tasa {rate.toFixed(2)}):</span>
                <span className="font-semibold">Bs. {totalBs}</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-foreground border-t border-dashed pt-1">
              <span>Total Abonado / Pagado:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${totalPaid.toFixed(2)}
              </span>
            </div>

            {pendingBalance > 0 && (
              <div className="flex justify-between text-xs font-bold text-destructive">
                <span>Saldo Pendiente:</span>
                <span>${pendingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Payments breakdown */}
          {sale.payments && sale.payments.length > 0 && (
            <div className="border-t border-dashed border-border pt-2 text-[10px] space-y-1">
              <span className="font-semibold text-muted-foreground">Cobros registrados:</span>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-muted-foreground">
                  <span>
                    {p.paymentMethod?.name || "Pago"}{" "}
                    {p.reference ? `(Ref: ${p.reference})` : ""}
                  </span>
                  <span className="font-medium text-foreground">
                    ${Number(p.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pendingBalance > 0 && (
            <div className="rounded-md bg-amber-500/10 p-2 text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Esta venta quedó guardada con saldo pendiente por cobrar.</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-3 bg-muted/20 border-t flex-col sm:flex-row gap-2">
          {sale.customer?.phone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              if (onNewSale) onNewSale();
            }}
            className="text-xs"
          >
            Listo / Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
