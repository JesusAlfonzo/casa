"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type LocationWarehouse,
  type TransferStockDTO,
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
import { ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface TransferStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  locations: LocationWarehouse[];
  defaultProductId?: string;
  defaultFromLocationId?: string;
  onSuccess?: () => void;
}

export function TransferStockModal({
  open,
  onOpenChange,
  products,
  locations,
  defaultProductId = "",
  defaultFromLocationId = "",
  onSuccess,
}: TransferStockModalProps) {
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState(defaultProductId);
  const [fromLocationId, setFromLocationId] = useState(defaultFromLocationId);
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync defaults safely
  const [prevDefaultProd, setPrevDefaultProd] = useState(defaultProductId);
  if (defaultProductId !== prevDefaultProd) {
    setPrevDefaultProd(defaultProductId);
    setProductId(defaultProductId);
  }

  const transferMutation = useMutation({
    mutationFn: async (payload: TransferStockDTO) => {
      return api.post<{ success: boolean; message: string }>(
        "/inventories/transfer",
        payload
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventories-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      onSuccess?.();
      onOpenChange(false);
      setReason("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "Error al realizar la transferencia. Verifica que el almacén de origen tenga stock disponible suficiente."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setErrorMsg("Debes seleccionar un producto.");
      return;
    }
    if (!fromLocationId) {
      setErrorMsg("Debes seleccionar el almacén de origen.");
      return;
    }
    if (!toLocationId) {
      setErrorMsg("Debes seleccionar el almacén de destino.");
      return;
    }
    if (fromLocationId === toLocationId) {
      setErrorMsg("El almacén de destino debe ser diferente al de origen.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("La cantidad debe ser mayor a 0.");
      return;
    }

    setErrorMsg(null);
    transferMutation.mutate({
      productId,
      fromLocationId,
      toLocationId,
      quantity,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Transferencia entre Almacenes
          </DialogTitle>
          <DialogDescription>
            Traspasa existencias de un depósito o sucursal a otro de forma controlada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Product Select */}
          <div className="space-y-1.5">
            <Label htmlFor="trans-prod" className="text-xs font-semibold">
              Producto a Transferir <span className="text-destructive">*</span>
            </Label>
            <select
              id="trans-prod"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Selecciona el producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouses From and To */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trans-from" className="text-xs font-semibold">
                Almacén Origen <span className="text-destructive">*</span>
              </Label>
              <select
                id="trans-from"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                required
              >
                <option value="">Desde almacén...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trans-to" className="text-xs font-semibold">
                Almacén Destino <span className="text-destructive">*</span>
              </Label>
              <select
                id="trans-to"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                required
              >
                <option value="">Hacia almacén...</option>
                {locations
                  .filter((loc) => loc.id !== fromLocationId)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="trans-qty" className="text-xs font-semibold">
              Cantidad a Traspasar <span className="text-destructive">*</span>
            </Label>
            <Input
              id="trans-qty"
              type="number"
              step="1"
              min="1"
              placeholder="1"
              className="text-sm font-bold"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="trans-notes" className="text-xs font-semibold">
              Nota / Guía de Traslado (Opcional)
            </Label>
            <Input
              id="trans-notes"
              placeholder="Ej. Reabastecimiento de sucursal centro, traslado en vehículo 2..."
              className="text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={transferMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {transferMutation.isPending ? "Transfiriendo..." : "Ejecutar Traslado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
