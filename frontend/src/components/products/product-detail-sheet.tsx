"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0"
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
            <div className="border-b border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
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
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle className="text-xl font-bold text-foreground">
                        {product.name}
                      </SheetTitle>
                      {product.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                        >
                          Activo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted bg-muted text-muted-foreground text-xs"
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
                  className="gap-1.5 text-xs self-start"
                  onClick={() => onEditProduct(product)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>

              {/* Critical Stock Alert */}
              {minAlert > 0 && totalStock <= minAlert && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Existencias bajas: el stock total actual ({totalStock} und.)
                      ha alcanzado o superado el umbral de alerta mínima ({minAlert} und.).
                    </span>
                  </div>
                  <Link
                    href="/inventory"
                    className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline"
                  >
                    Ajustar
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 space-y-6">
              {/* Financial & Margin Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Precios y Margen Comercial
                </h4>
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
              </div>

              {/* Multi-warehouse Stock Breakdown */}
              <div className="space-y-3">
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
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Almacén / Depósito</TableHead>
                          <TableHead className="text-xs">Ubicación</TableHead>
                          <TableHead className="text-right text-xs">Actual</TableHead>
                          <TableHead className="text-right text-xs">Reservado</TableHead>
                          <TableHead className="text-right text-xs font-semibold">
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
                              <TableCell className="text-xs font-semibold text-foreground">
                                {inv.location?.name || inv.location?.code || "Almacén Central"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {inv.specificLocation || "General"}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {curr}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {res}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold text-primary">
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

              {/* Technical Description */}
              {product.description && (
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-4 text-xs">
                  <span className="font-semibold text-foreground">
                    Descripción / Especificaciones
                  </span>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
