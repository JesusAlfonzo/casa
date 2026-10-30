"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type Supplier,
  type LocationWarehouse,
  type CreatePurchaseDTO,
  type CreatePurchaseItemInput,
} from "@/types/inventory";
import { type Currency } from "@/types/pos";
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
import { ShoppingBag, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface CreatePurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: Product[];
  locations: LocationWarehouse[];
  currencies: Currency[];
  onSuccess?: () => void;
}

interface ItemRow {
  tempId: string;
  productId: string;
  destinationLocationId: string;
  quantity: number;
  unitCost: number;
}

export function CreatePurchaseModal({
  open,
  onOpenChange,
  suppliers,
  products,
  locations,
  currencies,
  onSuccess,
}: CreatePurchaseModalProps) {
  const queryClient = useQueryClient();

  const defaultLocId = locations.find((l) => l.isDefault)?.id || locations[0]?.id || "";
  const defaultCurrId = currencies.find((c) => c.isBase)?.id || currencies[0]?.id || "";

  const [supplierId, setSupplierId] = useState("");
  const [currencyId, setCurrencyId] = useState(defaultCurrId);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [receiveOnCreate, setReceiveOnCreate] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<ItemRow[]>([
    {
      tempId: "item-1",
      productId: "",
      destinationLocationId: defaultLocId,
      quantity: 1,
      unitCost: 0,
    },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        tempId: `item-${Date.now()}`,
        productId: "",
        destinationLocationId: defaultLocId,
        quantity: 1,
        unitCost: 0,
      },
    ]);
  };

  const handleRemoveItem = (tempId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleProductSelect = (tempId: string, prodId: string) => {
    const selectedProd = products.find((p) => p.id === prodId);
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        return {
          ...item,
          productId: prodId,
          unitCost: selectedProd ? Number(selectedProd.averageCost || 0) : item.unitCost,
        };
      })
    );
  };

  const total = items.reduce(
    (acc, item) => acc + item.quantity * item.unitCost,
    0
  );

  const createMutation = useMutation({
    mutationFn: async (payload: CreatePurchaseDTO) => {
      return api.post<{ success: boolean; message: string }>(
        "/purchases",
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
      setSupplierId("");
      setSupplierInvoiceNumber("");
      setNotes("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message || "Error al registrar la orden de compra."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg("Debes seleccionar un proveedor.");
      return;
    }
    if (!currencyId) {
      setErrorMsg("Debes seleccionar la moneda de la compra.");
      return;
    }
    const invalidItem = items.find(
      (item) => !item.productId || item.quantity <= 0 || item.unitCost < 0
    );
    if (invalidItem) {
      setErrorMsg(
        "Verifica que todos los ítems tengan un producto seleccionado, cantidad mayor a 0 y costo válido."
      );
      return;
    }

    setErrorMsg(null);
    const purchaseItems: CreatePurchaseItemInput[] = items.map((i) => ({
      productId: i.productId,
      destinationLocationId: i.destinationLocationId || defaultLocId,
      quantity: i.quantity,
      unitCost: i.unitCost,
    }));

    createMutation.mutate({
      supplierId,
      supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
      currencyId,
      notes: notes.trim() || undefined,
      receiveOnCreate,
      items: purchaseItems,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Nueva Orden de Compra a Proveedor
          </DialogTitle>
          <DialogDescription>
            Registra una adquisición de mercancía física con opción de ingreso automático al inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Row 1: Supplier, Invoice & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pur-supp" className="text-xs font-semibold">
                Proveedor <span className="text-destructive">*</span>
              </Label>
              <select
                id="pur-supp"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Selecciona el proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.legalName} {s.tradeName ? `(${s.tradeName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pur-curr" className="text-xs font-semibold">
                Moneda
              </Label>
              <select
                id="pur-curr"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pur-inv" className="text-xs font-semibold">
                N° Factura
              </Label>
              <Input
                id="pur-inv"
                placeholder="Ej. FAC-10492"
                className="font-mono text-sm"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ítems de la Compra ({items.length})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleAddItem}
              >
                <Plus className="h-3 w-3" />
                Agregar Ítem
              </Button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.tempId}
                  className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border bg-card p-2.5 shadow-2xs"
                >
                  <div className="col-span-5 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Producto #{idx + 1}
                    </Label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.productId}
                      onChange={(e) =>
                        handleProductSelect(item.tempId, e.target.value)
                      }
                      required
                    >
                      <option value="">Selecciona producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Almacén Destino
                    </Label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item.destinationLocationId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.tempId === item.tempId
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

                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      Cantidad
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      className="h-8 text-xs font-bold text-center"
                      value={item.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.tempId === item.tempId
                              ? { ...i, quantity: parseFloat(e.target.value) || 0 }
                              : i
                          )
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">
                        Costo ($)
                      </Label>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveItem(item.tempId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-xs font-mono text-right"
                      value={item.unitCost}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.tempId === item.tempId
                              ? { ...i, unitCost: parseFloat(e.target.value) || 0 }
                              : i
                          )
                        )
                      }
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Receive Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pur-notes" className="text-xs font-semibold">
                Observaciones
              </Label>
              <Input
                id="pur-notes"
                placeholder="Condiciones de entrega, transportista, etc."
                className="text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <input
                  type="checkbox"
                  id="pur-receive-create"
                  checked={receiveOnCreate}
                  onChange={(e) => setReceiveOnCreate(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label htmlFor="pur-receive-create" className="text-xs font-medium cursor-pointer text-emerald-800 dark:text-emerald-300">
                  Ingresar mercancía al inventario inmediatamente al guardar
                </Label>
              </div>
            </div>
          </div>

          {/* Total Bar */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <span className="font-semibold text-muted-foreground">
              Total de la Orden de Compra:
            </span>
            <span className="text-xl font-bold font-mono text-primary">
              ${total.toFixed(2)} USD
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {createMutation.isPending
                ? "Registrando..."
                : "Crear Orden de Compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
