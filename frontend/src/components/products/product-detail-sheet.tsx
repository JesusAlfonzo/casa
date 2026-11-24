"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type Product } from "@/types/inventory";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  Loader2,
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

  const [activeTab, setActiveTab] = useState<
    "pricing" | "warehouses" | "specs"
  >("pricing");

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
  const unitAbbr = product?.measurementUnit?.abbreviation || "und.";

  const tabItems = [
    {
      id: "pricing" as const,
      label: "Precios y ganancia",
      icon: DollarSign,
      badge: `${marginPercent}%`,
    },
    {
      id: "warehouses" as const,
      label: "Existencias",
      icon: Warehouse,
      badge: `${totalAvailable} ${unitAbbr}`,
    },
    {
      id: "specs" as const,
      label: "Detalles",
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
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !product ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No se encontró la información del producto.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Encabezado */}
            <div className="border-b border-border bg-card p-6 sm:px-8 pr-14">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground">
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
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-xl font-bold text-foreground">
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
                          variant="secondary"
                          className="text-xs shrink-0"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                      {product.category?.name && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {product.category.name}
                        </Badge>
                      )}
                      {product.brand?.name && (
                        <span>{product.brand.name}</span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">
                        {product.sku}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="gap-2 text-sm h-10 px-4 shrink-0 self-start sm:self-center"
                  onClick={() => onEditProduct(product)}
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar</span>
                </Button>
              </div>

              {/* Aviso de stock bajo */}
              {(totalAvailable <= 0 ||
                (minAlert > 0 && totalAvailable <= minAlert)) && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      {totalAvailable <= 0
                        ? "Este producto está agotado (0 unidades)."
                        : `Quedan pocas unidades (${totalAvailable} ${unitAbbr}, alerta en ${minAlert}).`}
                    </span>
                  </div>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline shrink-0"
                  >
                    <span>Ajustar stock</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Contenido */}
            <div className="flex-1 p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 select-none">
                {tabItems.map((item) => {
                  const isSelected = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer outline-none",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold truncate">
                          {item.label}
                        </span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className="h-5 px-2 text-xs shrink-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pestaña 1: Precios y ganancia */}
              {activeTab === "pricing" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Costo
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                          ${cost.toFixed(2)}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Bs. {costBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-primary font-medium">
                          Precio de venta
                        </span>
                        <div className="text-lg font-bold font-mono text-primary">
                          ${price.toFixed(2)}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Bs. {priceBs}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          Ganancia
                        </span>
                        <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {marginPercent}%
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          +${unitProfitUSD} c/u
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-4 space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                          Al mayor
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                          ${Number(product.wholesalePrice || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Precio especial
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-5 space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Valor en mercancía (al costo)
                        </span>
                        <div className="text-2xl font-bold font-mono text-foreground">
                          ${(totalAvailable * cost).toFixed(2)}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Bs. {(totalAvailable * cost * exchangeRate).toFixed(2)}{" "}
                          ({totalAvailable} {unitAbbr})
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xs rounded-xl">
                      <CardContent className="p-5 space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Si vendes todo lo disponible
                        </span>
                        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ${(totalAvailable * price).toFixed(2)}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Bs. {(totalAvailable * price * exchangeRate).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Pestaña 2: Existencias */}
              {activeTab === "warehouses" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">
                      Unidades disponibles
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary font-semibold text-sm px-3 py-1"
                    >
                      Total: {totalAvailable} {unitAbbr}
                    </Badge>
                  </div>

                  {inventories.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-x-auto bg-card">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-sm font-semibold">
                              Ubicación
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold">
                              En stock
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold">
                              Reservado
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold">
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
                                <TableCell className="py-3.5 text-sm font-medium text-foreground">
                                  {inv.location?.name ||
                                    inv.location?.code ||
                                    "Almacén principal"}
                                  {inv.specificLocation && (
                                    <span className="block text-xs text-muted-foreground">
                                      {inv.specificLocation}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="py-3.5 text-right text-sm font-mono">
                                  {curr}
                                </TableCell>
                                <TableCell className="py-3.5 text-right text-sm font-mono text-muted-foreground">
                                  {res}
                                </TableCell>
                                <TableCell className="py-3.5 text-right text-sm font-mono font-bold text-primary">
                                  {avail} {unitAbbr}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                      <Warehouse className="mx-auto h-9 w-9 text-muted-foreground" />
                      <p className="text-base font-medium text-foreground">
                        Sin unidades registradas
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Agrega existencias desde Inventario o registrando una
                        compra.
                      </p>
                      <Link
                        href="/inventory"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 h-10 text-sm font-medium hover:bg-muted transition-colors mt-2"
                      >
                        Ir a Inventario
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Pestaña 3: Detalles */}
              {activeTab === "specs" && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-5 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Barcode className="h-4 w-4" />
                        Código (SKU)
                      </span>
                      <p className="font-mono font-semibold text-foreground">
                        {product.sku}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Barcode className="h-4 w-4" />
                        Código de barras
                      </span>
                      <p className="font-mono font-semibold text-foreground">
                        {product.barcode || "No registrado"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        Categoría
                      </span>
                      <p className="font-semibold text-foreground">
                        {product.category?.name || "Sin categoría"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Marca
                      </span>
                      <p className="font-semibold text-foreground">
                        {product.brand?.name || "Sin marca"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Unidad
                      </span>
                      <p className="font-semibold text-foreground">
                        {product.measurementUnit?.name || "Unidad"} ({unitAbbr})
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Alerta de pocas unidades
                      </span>
                      <p className="font-semibold text-foreground">
                        {minAlert > 0 ? `${minAlert} ${unitAbbr}` : "Sin alerta"}
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <div className="space-y-1.5 pt-3 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        Descripción
                      </span>
                      <p className="rounded-lg bg-muted/40 p-3 text-foreground leading-relaxed whitespace-pre-wrap">
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
