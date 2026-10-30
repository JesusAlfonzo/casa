"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type LocationWarehouse,
  type AdjustStockDTO,
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
import { SlidersHorizontal, CheckCircle2 } from "lucide-react";

interface AdjustStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  locations: LocationWarehouse[];
  defaultProductId?: string;
  defaultLocationId?: string;
  onSuccess?: () => void;
}

export function AdjustStockModal({
  open,
  onOpenChange,
  products,
  locations,
  defaultProductId = "",
  defaultLocationId = "",
  onSuccess,
}: AdjustStockModalProps) {
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState(defaultProductId);
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [type, setType] = useState<"POSITIVE_ADJUSTMENT" | "NEGATIVE_ADJUSTMENT" | "SHRINKAGE_OUT">("POSITIVE_ADJUSTMENT");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [unitCost, setUnitCost] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync defaults safely
  const [prevDefaultProd, setPrevDefaultProd] = useState(defaultProductId);
  if (defaultProductId !== prevDefaultProd) {
    setPrevDefaultProd(defaultProductId);
    setProductId(defaultProductId);
  }

  const adjustMutation = useMutation({
    mutationFn: async (payload: AdjustStockDTO) => {
      return api.post<{ success: boolean; message: string }>(
        "/inventories/adjust",
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
          "Error al aplicar el ajuste de inventario. Verifica que haya existencias suficientes si es una salida."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setErrorMsg("Debes seleccionar un producto.");
      return;
    }
    if (!locationId) {
      setErrorMsg("Debes seleccionar un almacén.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("La cantidad debe ser mayor a 0.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("El motivo o justificación del ajuste es obligatorio para auditoría.");
      return;
    }

    setErrorMsg(null);
    adjustMutation.mutate({
      productId,
      locationId,
      type,
      quantity,
      unitCost: unitCost && unitCost > 0 ? unitCost : undefined,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Ajuste Manual de Inventario
          </DialogTitle>
          <DialogDescription>
            Registra una entrada, salida o merma en el Kardex con motivo para auditoría contable.
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
            <Label htmlFor="adj-prod" className="text-xs font-semibold">
              Producto <span className="text-destructive">*</span>
            </Label>
            <select
              id="adj-prod"
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

          {/* Location Select */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-loc" className="text-xs font-semibold">
              Almacén / Depósito <span className="text-destructive">*</span>
            </Label>
            <select
              id="adj-loc"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
            >
              <option value="">Selecciona el almacén afectado</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-type" className="text-xs font-semibold">
              Tipo de Ajuste <span className="text-destructive">*</span>
            </Label>
            <select
              id="adj-type"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              onChange={(e) =>
                setType(
                  e.target.value as
                    | "POSITIVE_ADJUSTMENT"
                    | "NEGATIVE_ADJUSTMENT"
                    | "SHRINKAGE_OUT"
                )
              }
            >
              <option value="POSITIVE_ADJUSTMENT">
                ➕ Entrada / Sobrante (Conteo físico favorable)
              </option>
              <option value="NEGATIVE_ADJUSTMENT">
                ➖ Salida / Faltante (Descuadre de inventario)
              </option>
              <option value="SHRINKAGE_OUT">
                ⚠️ Merma / Daño / Vencimiento
              </option>
            </select>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adj-qty" className="text-xs font-semibold">
                Cantidad de Unidades <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adj-qty"
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

            <div className="space-y-1.5">
              <Label htmlFor="adj-cost" className="text-xs font-semibold text-muted-foreground">
                Costo Unitario (Opcional $)
              </Label>
              <Input
                id="adj-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-sm"
                value={unitCost ?? ""}
                onChange={(e) =>
                  setUnitCost(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason" className="text-xs font-semibold">
              Motivo o Justificación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj-reason"
              placeholder="Ej. Conteo físico fin de mes, artículo roto en traslado, etc."
              className="text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjustMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={adjustMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {adjustMutation.isPending ? "Aplicando..." : "Aplicar Ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
