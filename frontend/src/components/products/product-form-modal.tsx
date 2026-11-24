"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type CreateProductDTO,
  type Category,
  type Brand,
  type MeasurementUnit,
} from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Barcode,
  Sparkles,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess?: (savedProduct: Product) => void;
}

const emptyForm: CreateProductDTO = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  measurementUnitId: "",
  categoryId: "",
  brandId: "",
  averageCost: 0,
  baseSalePrice: 0,
  wholesalePrice: 0,
  minStockAlert: 5,
  imageUrl: "",
  isActive: true,
};

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(product?.id);

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const res = await api.get<
        { data?: Category[]; items?: Category[] } | Category[]
      >("/categories?limit=100");
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
    enabled: open,
  });

  const { data: brandsRes } = useQuery({
    queryKey: ["brands-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: Brand[]; items?: Brand[] } | Brand[]>(
        "/brands?limit=100"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
    enabled: open,
  });

  const { data: unitsRes } = useQuery({
    queryKey: ["measurement-units-all"],
    queryFn: async () => {
      const res = await api.get<
        { data?: MeasurementUnit[]; items?: MeasurementUnit[] } | MeasurementUnit[]
      >("/measurement-units?limit=50");
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
    enabled: open,
  });

  const categories = categoriesRes || [];
  const brands = brandsRes || [];
  const units = unitsRes || [];

  const [prevKey, setPrevKey] = useState<string>("");
  const [formData, setFormData] = useState<CreateProductDTO>(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentKey = `${product?.id || "new"}-${open}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (product && open) {
      setFormData({
        sku: product.sku || "",
        barcode: product.barcode || "",
        name: product.name || "",
        description: product.description || "",
        measurementUnitId: product.measurementUnitId || "",
        categoryId: product.categoryId || "",
        brandId: product.brandId || "",
        averageCost: Number(product.averageCost || 0),
        baseSalePrice: Number(product.baseSalePrice || 0),
        wholesalePrice: Number(product.wholesalePrice || 0),
        minStockAlert: Number(product.minStockAlert || 5),
        imageUrl: product.imageUrl || "",
        isActive: product.isActive ?? true,
      });
    } else {
      setFormData(emptyForm);
    }
    setErrorMsg(null);
  }

  const handleGenerateSKU = () => {
    const randomCode = "PRD-" + Math.floor(100000 + Math.random() * 900000);
    setFormData((prev) => ({
      ...prev,
      sku: prev.sku || randomCode,
      barcode:
        prev.barcode ||
        String(Math.floor(7590000000000 + Math.random() * 99999999)),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateProductDTO) => {
      if (isEditing && product?.id) {
        return api.put<{ success: boolean; data: Product }>(
          `/products/${product.id}`,
          payload
        );
      }
      return api.post<{ success: boolean; data: Product }>(
        "/products",
        payload
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      if (product?.id) {
        queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      }
      onSuccess?.(res.data);
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "No se pudo guardar el producto. Verifica que el código no esté repetido."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Escribe el nombre del producto.");
      return;
    }
    if (!formData.sku.trim()) {
      setErrorMsg("Escribe o genera un código para el producto.");
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg("Elige una categoría para el producto.");
      return;
    }
    const finalUnitId =
      formData.measurementUnitId || (units.length > 0 ? units[0].id : "");

    if (!finalUnitId) {
      setErrorMsg("Elige una unidad de medida.");
      return;
    }
    if (Number(formData.baseSalePrice) <= 0) {
      setErrorMsg("El precio de venta debe ser mayor a 0.");
      return;
    }

    setErrorMsg(null);
    saveMutation.mutate({
      ...formData,
      measurementUnitId: finalUnitId,
    });
  };

  const costNum = Number(formData.averageCost || 0);
  const priceNum = Number(formData.baseSalePrice || 0);
  const unitProfit = priceNum - costNum;
  const marginPct = priceNum > 0 ? ((unitProfit / priceNum) * 100).toFixed(1) : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Encabezado fijo */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? "Editar producto" : "Nuevo producto"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {isEditing
                  ? "Actualiza el nombre, precios o alertas de este producto."
                  : "Agrega un producto para venderlo y llevar el control de sus existencias."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          {/* Cuerpo con un solo scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Bloque 1: Datos básicos */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">
                Datos del producto
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="prod-name" className="text-sm font-medium">
                  Nombre del producto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prod-name"
                  placeholder="Ej. Cargador rápido 20W"
                  className="h-10 text-sm"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prod-sku" className="text-sm font-medium">
                      Código (SKU) <span className="text-destructive">*</span>
                    </Label>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={handleGenerateSKU}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generar código</span>
                      </button>
                    )}
                  </div>
                  <Input
                    id="prod-sku"
                    placeholder="Ej. PRD-123456"
                    className="h-10 font-mono text-sm"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-barcode" className="text-sm font-medium">
                    Código de barras (opcional)
                  </Label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="prod-barcode"
                      placeholder="Ej. 7591234567890"
                      className="pl-9 h-10 font-mono text-sm"
                      value={formData.barcode || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="prod-category"
                    className="text-sm font-medium"
                  >
                    Categoría <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="prod-category"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    required
                  >
                    <option value="">Elegir categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-brand" className="text-sm font-medium">
                    Marca (opcional)
                  </Label>
                  <select
                    id="prod-brand"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    value={formData.brandId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, brandId: e.target.value })
                    }
                  >
                    <option value="">Sin marca</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-unit" className="text-sm font-medium">
                    Unidad <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="prod-unit"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    value={
                      formData.measurementUnitId ||
                      (units.length > 0 ? units[0].id : "")
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        measurementUnitId: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Elegir unidad...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bloque 2: Precios y ganancia */}
            <div className="space-y-4 rounded-xl border border-border bg-muted/25 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Precios y ganancia (en dólares)
                </h3>
                {priceNum > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      unitProfit >= 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>
                      Ganancia: ${unitProfit.toFixed(2)} ({marginPct}%)
                    </span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-cost" className="text-sm font-medium">
                    ¿Cuánto te costó? ($)
                  </Label>
                  <Input
                    id="prod-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-10 text-sm font-mono bg-background"
                    value={formData.averageCost ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        averageCost: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="prod-price"
                    className="text-sm font-semibold text-primary"
                  >
                    Precio de venta ($) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="h-10 text-sm font-mono font-bold bg-background"
                    value={formData.baseSalePrice ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="prod-wholesale"
                    className="text-sm font-medium"
                  >
                    Precio al mayor (opcional)
                  </Label>
                  <Input
                    id="prod-wholesale"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-10 text-sm font-mono bg-background"
                    value={formData.wholesalePrice ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        wholesalePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Bloque 3: Alerta, descripción y estado */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-alert" className="text-sm font-medium">
                    Avisar cuando queden menos de
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="prod-alert"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="5"
                      className="w-24 h-10 text-sm font-mono text-center"
                      value={formData.minStockAlert ?? 5}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStockAlert: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      unidades
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-desc" className="text-sm font-medium">
                    Descripción o nota (opcional)
                  </Label>
                  <Input
                    id="prod-desc"
                    placeholder="Ej. Color negro, incluye cable USB-C"
                    className="h-10 text-sm"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="prod-active"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Producto activo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Visible en el catálogo para poder venderlo.
                  </p>
                </div>
                <Switch
                  id="prod-active"
                  checked={Boolean(formData.isActive)}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Pie fijo */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-10 px-5 text-sm font-medium gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>
                {saveMutation.isPending
                  ? "Guardando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Guardar producto"}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
