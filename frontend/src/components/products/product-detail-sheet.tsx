"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type Product } from "@/types/inventory";
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
  Package,
  Barcode,
  Warehouse,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Edit,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
  Boxes,
} from "lucide-react";

interface ProductDetailSheetProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProduct: (product: Product) => void;
  exchangeRate?: number;
}

export function ProductDetailSheet({
  productId,
  open,
  onOpenChange,
  onEditProduct,
  exchangeRate = 1,
}: ProductDetailSheetProps) {
  const { data: productRes, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await api.get<{ data?: Product } | Product>(
        `/products/${productId}`
      );
      if ("data" in res && res.data) return res.data;
      return res as Product;
    },
    enabled: Boolean(productId && open),
  });

  const product = productRes;

  const [activeTab, setActiveTab] = useState<"pricing" | "warehouses" | "specs">("pricing");

  const inventories = product?.inventories || [];
  const totalStock = inventories.reduce(
    (acc, inv) => acc + Number(inv.currentQuantity || 0),
    0
  );
  const totalReserved = inventories.reduce(
    (acc, inv) => acc + Number(inv.reservedQuantity || 0),
    0
  );
  const totalAvailable = Math.max(0, totalStock - totalReserved);

  const cost = Number(product?.averageCost || 0);
  const price = Number(product?.baseSalePrice || 0);
  const priceBs = (price * exchangeRate).toFixed(2);
  const costBs = (cost * exchangeRate).toFixed(2);
  const marginPercent =
    price > 0 ? (((price - cost) / price) * 100).toFixed(1) : "0.0";
  const unitProfitUSD = Math.max(0, price - cost).toFixed(2);
  const minAlert = Number(product?.minStockAlert || 0);

  const tabItems = [
    {
      id: "pricing" as const,
      label: "Precios & Margen",
      icon: DollarSign,
      badge: `${marginPercent}%`,
    },
    {
      id: "warehouses" as const,
      label: "Almacenes & Stock",
      icon: Warehouse,
      badge: inventories.length,
    },
    {
      id: "specs" as const,
      label: "Ficha Técnica",
      icon: Package,
      badge: undefined,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0"
      >
        {isLoading && !product ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !product ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No se encontró la información del producto.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header / Hero */}
            <div className="border-b border-border bg-card p-6 sm:px-8 pr-14">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground font-bold">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <Package className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-xl font-bold text-foreground truncate">
                        {product.name}
                      </SheetTitle>
                      {product.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs shrink-0"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted bg-muted text-muted-foreground text-xs shrink-0"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">
                        SKU: {product.sku}
                      </span>
                      {product.barcode && (
                        <span className="flex items-center gap-1 font-mono">
                          <Barcode className="h-3.5 w-3.5" />
                          {product.barcode}
                        </span>
                      )}
                      {product.category?.name && (
                        <Badge variant="outline" className="text-[10px]">
                          {product.category.name}
                        </Badge>
                      )}
                      {product.brand?.name && (
                        <span className="text-xs text-muted-foreground">
                          Marca: {product.brand.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-9 px-3.5 shadow-2xs shrink-0 self-start sm:self-center"
                  onClick={() => onEditProduct(product)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>

              {/* Critical Stock Alert */}
              {minAlert > 0 && totalStock <= minAlert && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Existencias bajas: el stock total actual ({totalStock} und.)
                      ha alcanzado o superado el umbral de alerta mínima ({minAlert} und.).
                    </span>
                  </div>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline shrink-0"
                  >
                    Ajustar
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 sm:p-8 space-y-6">
              {/* Interactive Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 select-none">
                {tabItems.map((item) => {
                  const isSelected = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 p-3 sm:py-3 sm:px-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer outline-none shadow-2xs",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary dark:bg-white/10 dark:border-white/40 dark:text-white shadow-xs ring-1 ring-primary/40 dark:ring-white/30"
                          : "border-border/80 bg-card hover:bg-muted/60 hover:border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900 shadow-2xs"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={cn(
                            "text-xs sm:text-sm font-semibold truncate",
                            isSelected
                              ? "text-foreground dark:text-white font-bold"
                              : "text-foreground/80"
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className={cn(
                            "h-5 px-1.5 text-[11px] font-semibold shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900 border-transparent font-bold"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Precios & Margen */}
              {activeTab === "pricing" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="shadow-xs">
                      <CardContent className="p-3.5 space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          Costo Promedio
                        </span>
                        <div className="text-base font-bold text-foreground">
                          ${cost.toFixed(2)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Bs. {costBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                      <CardContent className="p-3.5 space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-primary" />
                          Precio de Venta
                        </span>
                        <div className="text-base font-bold text-primary">
                          ${price.toFixed(2)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Bs. {priceBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                      <CardContent className="p-3.5 space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          Margen Bruto
                        </span>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {marginPercent}%
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          +${unitProfitUSD} / und.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                      <CardContent className="p-3.5 space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-blue-500" />
                          Mayorista
                        </span>
                        <div className="text-base font-bold text-foreground">
                          ${Number(product.wholesalePrice || 0).toFixed(2)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Especial
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Valuation Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="shadow-xs border-border/80">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                          Valor en Inventario (al costo)
                        </span>
                        <div className="text-lg font-bold text-foreground">
                          ${(totalAvailable * cost).toFixed(2)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bs. {((totalAvailable * cost) * exchangeRate).toFixed(2)} ({totalAvailable} {product.measurementUnit?.abbreviation || "und."} disponibles)
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs border-border/80">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          Ingreso Proyectado (Venta)
                        </span>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ${(totalAvailable * price).toFixed(2)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Bs. {((totalAvailable * price) * exchangeRate).toFixed(2)} al PVP base
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Tab 2: Almacenes & Stock */}
              {activeTab === "warehouses" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Warehouse className="h-4 w-4" />
                      Existencias por Almacén ({inventories.length})
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Total Disponible:
                      </span>
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary font-bold text-xs"
                      >
                        {totalAvailable} {product.measurementUnit?.abbreviation || "und."}
                      </Badge>
                    </div>
                  </div>

                  {inventories.length > 0 ? (
                    <div className="rounded-lg border border-border overflow-x-auto bg-card shadow-xs">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Almacén / Depósito</TableHead>
                            <TableHead className="h-10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubicación</TableHead>
                            <TableHead className="text-right h-10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actual</TableHead>
                            <TableHead className="text-right h-10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reservado</TableHead>
                            <TableHead className="text-right h-10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Disponible
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventories.map((inv) => {
                            const curr = Number(inv.currentQuantity || 0);
                            const res = Number(inv.reservedQuantity || 0);
                            const avail = Math.max(0, curr - res);

                            return (
                              <TableRow key={inv.id}>
                                <TableCell className="py-3.5 px-4 text-xs font-semibold text-foreground">
                                  {inv.location?.name || inv.location?.code || "Almacén Central"}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                                  {inv.specificLocation || "General"}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-right text-xs">
                                  {curr}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-right text-xs text-muted-foreground">
                                  {res}
                                </TableCell>
                                <TableCell className="py-3.5 px-4 text-right text-xs font-bold text-primary">
                                  {avail}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
                      <Warehouse className="mx-auto h-7 w-7 text-muted-foreground" />
                      <p className="text-xs font-medium text-foreground">
                        Sin existencias registradas en almacenes
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Realiza una compra a proveedor o un ajuste de inventario para ingresar unidades.
                      </p>
                      <Link
                        href="/inventory"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors mt-2"
                      >
                        Ir a Control de Inventario
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Ficha Técnica */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-card p-5 space-y-4 text-xs shadow-xs">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Boxes className="h-4 w-4" />
                      Propiedades y Clasificación
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5" />
                          Código SKU:
                        </span>
                        <p className="font-mono font-semibold text-foreground">
                          {product.sku}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5" />
                          Código de Barras:
                        </span>
                        <p className="font-mono font-semibold text-foreground">
                          {product.barcode || "No asignado"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          Categoría:
                        </span>
                        <p className="font-semibold text-foreground">
                          {product.category?.name || "Sin categoría"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">
                          Marca:
                        </span>
                        <p className="font-semibold text-foreground">
                          {product.brand?.name || "Sin marca"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium">
                          Unidad de Medida:
                        </span>
                        <p className="font-semibold text-foreground">
                          {product.measurementUnit?.name} ({product.measurementUnit?.abbreviation || "und."})
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          Alerta Stock Mínimo:
                        </span>
                        <p className="font-semibold text-foreground">
                          {minAlert > 0 ? `${minAlert} unidades` : "Desactivada"}
                        </p>
                      </div>
                    </div>

                    {/* Technical Description */}
                    {product.description && (
                      <div className="space-y-1.5 pt-3 border-t border-border">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          Descripción y Especificaciones:
                        </span>
                        <p className="rounded-md bg-muted/50 p-3 text-foreground leading-relaxed whitespace-pre-wrap">
                          {product.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
