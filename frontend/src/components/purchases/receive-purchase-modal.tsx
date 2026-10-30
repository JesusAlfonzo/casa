"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Purchase,
  type LocationWarehouse,
} from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackageCheck, CheckCircle2 } from "lucide-react";

interface ReceivePurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
  locations: LocationWarehouse[];
  onSuccess?: () => void;
}

interface ItemReceiveRow {
  purchaseItemId: string;
  productName: string;
  sku: string;
  ordered: number;
  alreadyReceived: number;
  pending: number;
  quantityToReceive: number;
  destinationLocationId: string;
}

export function ReceivePurchaseModal({
  open,
  onOpenChange,
  purchase,
  locations,
  onSuccess,
}: ReceivePurchaseModalProps) {
  const queryClient = useQueryClient();
  const defaultLocId = locations[0]?.id || "";

  // Initialize item rows from purchase
  const [prevPurchaseId, setPrevPurchaseId] = useState<string | null>(purchase?.id || null);
  const [itemsToReceive, setItemsToReceive] = useState<ItemReceiveRow[]>(() => {
    if (!purchase?.items) return [];
    return purchase.items.map((item) => {
      const ordered = Number(item.quantity || 0);
      const already = Number(item.receivedQuantity || 0);
      const pending = Math.max(0, ordered - already);
      return {
        purchaseItemId: item.id,
        productName: item.product?.name || item.description || "Producto",
        sku: item.product?.sku || "-",
        ordered,
        alreadyReceived: already,
        pending,
        quantityToReceive: pending,
        destinationLocationId: item.destinationLocationId || defaultLocId,
      };
    });
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPurchaseId = purchase?.id || null;
  if (currentPurchaseId !== prevPurchaseId) {
    setPrevPurchaseId(currentPurchaseId);
    if (purchase?.items) {
      setItemsToReceive(
        purchase.items.map((item) => {
          const ordered = Number(item.quantity || 0);
          const already = Number(item.receivedQuantity || 0);
          const pending = Math.max(0, ordered - already);
          return {
            purchaseItemId: item.id,
            productName: item.product?.name || item.description || "Producto",
            sku: item.product?.sku || "-",
            ordered,
            alreadyReceived: already,
            pending,
            quantityToReceive: pending,
            destinationLocationId: item.destinationLocationId || defaultLocId,
          };
        })
      );
    } else {
      setItemsToReceive([]);
    }
    setErrorMsg(null);
  }

  const receiveMutation = useMutation({
    mutationFn: async (payload: {
      items?: Array<{
        purchaseItemId: string;
        receivedQuantity: number;
        destinationLocationId?: string;
      }>;
    }) => {
      if (!purchase?.id) throw new Error("ID de orden no disponible.");
      return api.post<{ success: boolean; message: string }>(
        `/purchases/${purchase.id}/receive`,
        payload
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventories-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      onSuccess?.();
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message || "Error al procesar la recepción de mercancía."
      );
    },
  });

  const handleReceiveAll = () => {
    // If items are empty or 100% receive
    receiveMutation.mutate({});
  };

  const handleCustomReceive = (e: React.FormEvent) => {
    e.preventDefault();
    const activeItems = itemsToReceive
      .filter((i) => i.quantityToReceive > 0)
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        receivedQuantity: i.quantityToReceive,
        destinationLocationId: i.destinationLocationId,
      }));

    if (activeItems.length === 0) {
      setErrorMsg("Debes especificar al menos 1 unidad para recibir en inventario.");
      return;
    }

    setErrorMsg(null);
    receiveMutation.mutate({ items: activeItems });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            Recepción de Mercancía en Almacén
          </DialogTitle>
          <DialogDescription>
            Orden de Compra: <strong>{purchase?.orderNumber}</strong> • Proveedor:{" "}
            <strong>{purchase?.supplier?.legalName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCustomReceive} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Artículos a Recepcionar
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleReceiveAll}
                disabled={receiveMutation.isPending}
              >
                Recepcionar 100% Pendiente
              </Button>
            </div>

            <div className="space-y-3">
              {itemsToReceive.map((item) => (
                <div
                  key={item.purchaseItemId}
                  className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-xs text-foreground">
                        {item.productName}
                      </span>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-muted-foreground">
                        Ordenado: <strong>{item.ordered}</strong>
                      </span>
                      <span className="mx-1 text-muted-foreground">•</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Recibido: <strong>{item.alreadyReceived}</strong>
                      </span>
                      <span className="mx-1 text-muted-foreground">•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Pendiente: {item.pending}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Almacén de Ingreso
                      </Label>
                      <select
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        value={item.destinationLocationId}
                        onChange={(e) =>
                          setItemsToReceive((prev) =>
                            prev.map((i) =>
                              i.purchaseItemId === item.purchaseItemId
                                ? { ...i, destinationLocationId: e.target.value }
                                : i
                            )
                          )
                        }
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} - {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Cantidad a Ingresar Ahora
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max={item.pending}
                        className="h-8 text-xs font-bold text-center"
                        value={item.quantityToReceive}
                        onChange={(e) =>
                          setItemsToReceive((prev) =>
                            prev.map((i) =>
                              i.purchaseItemId === item.purchaseItemId
                                ? {
                                    ...i,
                                    quantityToReceive:
                                      parseFloat(e.target.value) || 0,
                                  }
                                : i
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={receiveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={receiveMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {receiveMutation.isPending
                ? "Procesando Ingreso..."
                : "Confirmar Ingreso al Almacén"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
