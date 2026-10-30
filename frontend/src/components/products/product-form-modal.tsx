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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Barcode,
  Sparkles,
  CheckCircle2,
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

  // Queries for selectors
  const { data: categoriesRes } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: Category[]; items?: Category[] } | Category[]>(
        "/categories?limit=100"
      );
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
      const res = await api.get<{ data?: MeasurementUnit[]; items?: MeasurementUnit[] } | MeasurementUnit[]>(
        "/measurement-units?limit=50"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
    enabled: open,
  });

  const categories = categoriesRes || [];
  const brands = brandsRes || [];
  const units = unitsRes || [];

  // State synchronization safely for React 19
  const [prevProduct, setPrevProduct] = useState<Product | null | undefined>(product);
  const [formData, setFormData] = useState<CreateProductDTO>(
    product
      ? {
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
        }
      : emptyForm
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (product !== prevProduct) {
    setPrevProduct(product);
    setFormData(
      product
        ? {
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
          }
        : emptyForm
    );
    setErrorMsg(null);
  }

  // Generate a random unique SKU/Barcode
  const handleGenerateSKU = () => {
    const randomCode = "PRD-" + Math.floor(100000 + Math.random() * 900000);
    setFormData((prev) => ({
      ...prev,
      sku: prev.sku || randomCode,
      barcode: prev.barcode || String(Math.floor(7590000000000 + Math.random() * 99999999)),
    }));
  };

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: CreateProductDTO) => {
      if (isEditing && product?.id) {
        return api.put<{ success: boolean; data: Product }>(
          `/products/${product.id}`,
          payload
        );
      } else {
        return api.post<{ success: boolean; data: Product }>(
          "/products",
          payload
        );
      }
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
          "Error al guardar el producto. Por favor verifica que el SKU o código de barras no estén duplicados."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("El nombre del producto es obligatorio.");
      return;
    }
    if (!formData.sku.trim()) {
      setErrorMsg("El código SKU es obligatorio.");
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg("Debes seleccionar una categoría para el producto.");
      return;
    }
    const finalUnitId =
      formData.measurementUnitId || (units.length > 0 ? units[0].id : "");

    if (!finalUnitId) {
      setErrorMsg("Debes seleccionar una unidad de medida.");
      return;
    }
    if (Number(formData.baseSalePrice) <= 0) {
      setErrorMsg("El precio base de venta debe ser mayor a 0.");
      return;
    }

    setErrorMsg(null);
    saveMutation.mutate({
      ...formData,
      measurementUnitId: finalUnitId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Producto" : "Nuevo Producto en Catálogo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos técnicos, precios y configuración de existencias."
              : "Registra un nuevo producto físico con control de inventario y alertas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          {/* Row 1: SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="prod-sku" className="text-xs font-semibold">
                  Código SKU <span className="text-destructive">*</span>
                </Label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateSKU}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-generar
                  </button>
                )}
              </div>
              <Input
                id="prod-sku"
                placeholder="Ej. AUD-PRO-01"
                className="font-mono text-sm"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value.toUpperCase() })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-barcode" className="text-xs font-semibold">
                Código de Barras (EAN / UPC)
              </Label>
              <div className="relative">
                <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="prod-barcode"
                  placeholder="Ej. 7591234567890"
                  className="pl-9 font-mono text-sm"
                  value={formData.barcode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Row 2: Name */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-name" className="text-xs font-semibold">
              Nombre del Producto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prod-name"
              placeholder="Ej. Auriculares Bluetooth Inalámbricos Pro"
              className="text-sm font-medium"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Row 3: Category, Brand, Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-category" className="text-xs font-semibold">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <select
                id="prod-category"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                required
              >
                <option value="">Selecciona Categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-brand" className="text-xs font-semibold">
                Marca (Opcional)
              </Label>
              <select
                id="prod-brand"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={formData.brandId || ""}
                onChange={(e) =>
                  setFormData({ ...formData, brandId: e.target.value })
                }
              >
                <option value="">Sin Marca / Genérica</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-unit" className="text-xs font-semibold">
                Unidad de Medida <span className="text-destructive">*</span>
              </Label>
              <select
                id="prod-unit"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={formData.measurementUnitId}
                onChange={(e) =>
                  setFormData({ ...formData, measurementUnitId: e.target.value })
                }
                required
              >
                <option value="">Selecciona Unidad</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Pricing & Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-cost" className="text-xs font-semibold text-muted-foreground">
                Costo Promedio (USD)
              </Label>
              <Input
                id="prod-cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-sm"
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
              <Label htmlFor="prod-price" className="text-xs font-semibold text-primary">
                Precio de Venta Base (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prod-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="text-sm font-bold"
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
              <Label htmlFor="prod-wholesale" className="text-xs font-semibold text-muted-foreground">
                Precio Mayorista (USD)
              </Label>
              <Input
                id="prod-wholesale"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-sm"
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

          {/* Row 5: Min Stock Alert & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-alert" className="text-xs font-semibold">
                Alerta de Stock Mínimo (Unidades)
              </Label>
              <Input
                id="prod-alert"
                type="number"
                step="1"
                min="0"
                placeholder="5"
                className="text-sm"
                value={formData.minStockAlert ?? 5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStockAlert: parseInt(e.target.value) || 0,
                  })
                }
              />
              <span className="text-[11px] text-muted-foreground">
                El sistema alertará cuando las existencias totales sean iguales o menores.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-image" className="text-xs font-semibold">
                URL de Imagen (Opcional)
              </Label>
              <Input
                id="prod-image"
                placeholder="https://..."
                className="text-sm"
                value={formData.imageUrl || ""}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-desc" className="text-xs font-semibold">
              Descripción o Características
            </Label>
            <Input
              id="prod-desc"
              placeholder="Especificaciones, modelo, garantía..."
              className="text-sm"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="prod-active"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="prod-active" className="text-xs font-medium cursor-pointer">
              Producto Activo (Visible en Catálogo y Punto de Venta POS)
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saveMutation.isPending
                ? "Guardando..."
                : isEditing
                ? "Actualizar Producto"
                : "Guardar Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
