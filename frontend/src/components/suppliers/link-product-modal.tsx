"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type SupplierItem, type AssignSupplierProductDTO } from "@/types/supplier";
import { type Product } from "@/types/inventory";
import { type Currency } from "@/types/pos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PackagePlus, Loader2 } from "lucide-react";

interface LinkProductModalProps {
  supplier: SupplierItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkProductModal({
  supplier,
  open,
  onOpenChange,
}: LinkProductModalProps) {
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState("");
  const [supplierProductCode, setSupplierProductCode] = useState("");
  const [lastCost, setLastCost] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  // Fetch products
  const { data: productsData } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["products-list-all"],
    queryFn: () => api.get("/products?limit=100"),
    enabled: open,
  });

  // Fetch currencies
  const { data: currenciesData } = useQuery<{ success: boolean; data: Currency[] }>({
    queryKey: ["currencies-active"],
    queryFn: () => api.get("/currencies?isActive=true"),
    enabled: open,
  });

  const products = productsData?.data || [];
  const currencies = currenciesData?.data || [];

  const linkMutation = useMutation({
    mutationFn: (body: AssignSupplierProductDTO) => api.post("/supplier-products", body),
    onSuccess: () => {
      toast.success("Producto vinculado exitosamente al proveedor");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-detail", supplier?.id],
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al vincular producto");
    },
  });

  const resetForm = () => {
    setProductId("");
    setSupplierProductCode("");
    setLastCost("");
    setCurrencyId("");
    setLeadTimeDays("");
    setIsPrimary(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier) return;
    if (!productId) {
      toast.error("Seleccione un producto para vincular");
      return;
    }

    linkMutation.mutate({
      supplierId: supplier.id,
      productId,
      supplierProductCode: supplierProductCode.trim() || undefined,
      lastCost: lastCost ? parseFloat(lastCost) : undefined,
      currencyId: currencyId || undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
      isPrimary,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Vincular Producto</DialogTitle>
              <DialogDescription className="text-xs">
                Asocie un producto del catálogo al proveedor{" "}
                <span className="font-semibold text-foreground">
                  {supplier?.legalName}
                </span>
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Producto */}
          <div className="space-y-1.5">
            <Label className="text-xs">Producto del Catálogo *</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Seleccione un producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Código propio del proveedor */}
          <div className="space-y-1.5">
            <Label className="text-xs">Código / SKU del Proveedor</Label>
            <Input
              placeholder="Ej: DIST-REF-908"
              value={supplierProductCode}
              onChange={(e) => setSupplierProductCode(e.target.value)}
            />
          </div>

          {/* Costo pactado y Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Costo de Compra</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={lastCost}
                onChange={(e) => setLastCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Moneda</Label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seleccionar moneda...</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Días de Entrega */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tiempo Estimado de Entrega (Días)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ej: 3"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
          </div>

          {/* Proveedor Primario */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-medium text-foreground">
                Establecer como proveedor principal de este producto
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={linkMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={linkMutation.isPending}>
              {linkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vincular al Catálogo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
