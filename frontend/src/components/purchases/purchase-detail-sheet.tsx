"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
  Loader2,
  FileQuestion,
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
  // Query full purchase details whenever sheet is open and purchase id is provided
  const { data: detailedPurchase, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["purchase-detail", purchase?.id],
    queryFn: async () => {
      if (!purchase?.id) return null;
      const res = await api.get<{ data?: Purchase } | Purchase>(`/purchases/${purchase.id}`);
      if (res && "data" in res && res.data) return res.data;
      return res as Purchase;
    },
    enabled: !!purchase?.id && open,
  });

  if (!purchase) return null;

  const currentPurchase = detailedPurchase || purchase;
  const totalUSD = Number(currentPurchase.total || 0);
  const totalBs = (totalUSD * exchangeRate).toFixed(2);
  const isReceived = currentPurchase.status === "RECEIVED";
  const isCancelled = currentPurchase.status === "CANCELLED";
  const items = currentPurchase.items || [];

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            Recibida 100%
          </Badge>
        );
      case "PARTIALLY_RECEIVED":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            Parcialmente Recibida
          </Badge>
        );
      case "PENDING":
      case "ORDERED":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            Pendiente de Recepción
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelada
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            Pagada
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            Pago Parcial
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
                    {currentPurchase.orderNumber}
                  </SheetTitle>
                  {renderStatusBadge(currentPurchase.status)}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Building className="h-3.5 w-3.5" />
                    {currentPurchase.supplier?.legalName}
                  </span>
                  {currentPurchase.supplierInvoiceNumber && (
                    <span className="font-mono">
                      Factura Prov: {currentPurchase.supplierInvoiceNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(currentPurchase.purchasedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {!isReceived && !isCancelled && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs self-start"
                  onClick={() => onReceiveItems(currentPurchase)}
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
                    {items.length} ítems
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
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Desglose de Productos Adquiridos
              </h4>
              {isLoadingDetail && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Actualizando...</span>
                </div>
              )}
            </div>

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
                  {isLoadingDetail && items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Cargando productos adquiridos...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <FileQuestion className="h-6 w-6 text-muted-foreground/60" />
                          <p className="font-medium text-foreground">No hay productos registrados en esta orden</p>
                          <p className="text-[11px]">La orden no contiene líneas de detalle activas.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
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
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Notes */}
            {currentPurchase.notes && (
              <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground">Notas:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentPurchase.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
