"use client";

import React from "react";
import { type Purchase } from "@/types/inventory";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Building,
  Calendar,
  DollarSign,
  PackageCheck,
  Package,
} from "lucide-react";

interface PurchaseDetailSheetProps {
  purchase: Purchase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceiveItems: (purchase: Purchase) => void;
  exchangeRate?: number;
}

export function PurchaseDetailSheet({
  purchase,
  open,
  onOpenChange,
  onReceiveItems,
  exchangeRate = 1,
}: PurchaseDetailSheetProps) {
  if (!purchase) return null;

  const totalUSD = Number(purchase.total || 0);
  const totalBs = (totalUSD * exchangeRate).toFixed(2);
  const isReceived = purchase.status === "RECEIVED";
  const isCancelled = purchase.status === "CANCELLED";

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
            Recibida 100%
          </Badge>
        );
      case "PARTIALLY_RECEIVED":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs font-semibold">
            Parcialmente Recibida
          </Badge>
        );
      case "ORDERED":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-xs font-semibold">
            Ordenada / En Tránsito
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-border bg-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl font-bold font-mono text-foreground">
                    {purchase.orderNumber}
                  </SheetTitle>
                  {renderStatusBadge(purchase.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Building className="h-3.5 w-3.5" />
                    {purchase.supplier?.legalName}
                  </span>
                  {purchase.supplierInvoiceNumber && (
                    <span className="font-mono">
                      Factura Prov: {purchase.supplierInvoiceNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(purchase.purchasedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {!isReceived && !isCancelled && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs self-start"
                  onClick={() => onReceiveItems(purchase)}
                >
                  <PackageCheck className="h-4 w-4" />
                  Recibir Mercancía
                </Button>
              )}
            </div>

            {/* Financial Card */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card className="shadow-xs">
                <CardContent className="p-3 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-primary" />
                    Total Compra (USD)
                  </span>
                  <div className="text-lg font-bold font-mono text-foreground">
                    ${totalUSD.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Bs. {totalBs}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardContent className="p-3 space-y-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    Artículos
                  </span>
                  <div className="text-lg font-bold text-foreground">
                    {purchase.items?.length || 0} ítems
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    En esta orden de compra
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex-1 p-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Desglose de Productos Adquiridos
            </h4>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-center text-xs">Cant. Pedida</TableHead>
                    <TableHead className="text-center text-xs">Cant. Recibida</TableHead>
                    <TableHead className="text-right text-xs">Costo Unit.</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items?.map((item) => {
                    const ordered = Number(item.quantity || 0);
                    const received = Number(item.receivedQuantity || 0);
                    const cost = Number(item.unitCost || 0);
                    const sub = Number(item.subtotal || 0);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">
                              {item.product?.name || item.description || "Producto"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              SKU: {item.product?.sku || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {ordered}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {received}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ${cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          ${sub.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground">Notas:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {purchase.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
