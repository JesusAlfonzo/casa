"use client";

import React, { useMemo, useState } from "react";
import {
  type ProductCatalogItem,
  type ServiceCatalogItem,
  type CartItem,
} from "@/types/pos";
import {
  Search,
  Package,
  Tv,
  Plus,
  AlertCircle,
  LayoutGrid,
  X,
  Loader2,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface PosCatalogProps {
  products: ProductCatalogItem[];
  services: ServiceCatalogItem[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  exchangeRate?: number;
  isLoading?: boolean;
}

export function PosCatalog({
  products,
  services,
  cart,
  onAddToCart,
  exchangeRate = 1,
  isLoading,
}: PosCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [tab, setTab] = useState<"ALL" | "PRODUCTS" | "SERVICES">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Extraer categorías únicas de los productos
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const prod of products) {
      const catName = prod.category?.name?.trim() || "General";
      map.set(catName, (map.get(catName) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleBarcodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      const match = products.find(
        (p) =>
          p.barcode?.toLowerCase() === searchTerm.trim().toLowerCase() ||
          p.sku.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      if (match) {
        handleAddProduct(match);
        setSearchTerm("");
      }
    }
  };

  const handleAddProduct = (prod: ProductCatalogItem) => {
    const totalStock =
      prod.inventories?.reduce(
        (acc, inv) => acc + Number(inv.currentQuantity || 0),
        0
      ) ?? 0;

    const price = Number(prod.baseSalePrice || 0);

    onAddToCart({
      tempId: `prod-${prod.id}`,
      itemType: "PRODUCT",
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      unitPrice: price,
      quantity: 1,
      discountAmount: 0,
      taxPercentage: 0,
      subtotal: price,
      stock: totalStock,
      categoryName: prod.category?.name,
    });
  };

  const handleAddService = (srv: ServiceCatalogItem) => {
    const price = Number(srv.basePrice || 0);

    onAddToCart({
      tempId: `srv-${srv.id}`,
      itemType: "SERVICE",
      serviceId: srv.id,
      name: srv.name,
      sku: srv.code,
      unitPrice: price,
      quantity: 1,
      discountAmount: 0,
      taxPercentage: 0,
      subtotal: price,
      categoryName: srv.serviceType?.name || "Streaming",
    });
  };

  const term = debouncedSearchTerm.toLowerCase().trim();

  const filteredProducts = products.filter((p) => {
    if (tab === "SERVICES") return false;
    const catName = p.category?.name?.trim() || "General";
    if (selectedCategory !== "ALL" && catName !== selectedCategory) {
      return false;
    }
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      catName.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  const filteredServices = services.filter((s) => {
    if (tab === "PRODUCTS") return false;
    // Si hay una categoría de producto seleccionada, mostramos solo productos de esa categoría
    if (selectedCategory !== "ALL") return false;
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term)
    );
  });

  const totalFilteredCount = filteredProducts.length + filteredServices.length;

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Buscador y filtros */}
      <div className="space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto, servicio o escanear código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            className="pl-10 pr-10 h-10 text-sm bg-card rounded-xl border-border shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtro principal: Todos / Productos / Servicios */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <Button
            type="button"
            variant={tab === "ALL" ? "default" : "outline"}
            onClick={() => setTab("ALL")}
            className="rounded-xl px-3.5 h-9 gap-1.5 text-sm font-medium shrink-0"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Todos ({products.length + services.length})</span>
          </Button>
          <Button
            type="button"
            variant={tab === "PRODUCTS" ? "default" : "outline"}
            onClick={() => setTab("PRODUCTS")}
            className="rounded-xl px-3.5 h-9 gap-1.5 text-sm font-medium shrink-0"
          >
            <Package className="h-4 w-4" />
            <span>Productos ({products.length})</span>
          </Button>
          <Button
            type="button"
            variant={tab === "SERVICES" ? "default" : "outline"}
            onClick={() => {
              setTab("SERVICES");
              setSelectedCategory("ALL");
            }}
            className="rounded-xl px-3.5 h-9 gap-1.5 text-sm font-medium shrink-0"
          >
            <Tv className="h-4 w-4" />
            <span>Streaming y servicios ({services.length})</span>
          </Button>
        </div>

        {/* Filtro por categoría de producto */}
        {tab !== "SERVICES" && categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1 shrink-0">
              <Tag className="h-3.5 w-3.5" />
              <span>Categoría:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 border",
                selectedCategory === "ALL"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
              )}
            >
              Todas
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(isSelected ? "ALL" : cat.name)
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 border",
                    isSelected
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cuadrícula de productos y servicios (con padding para que nunca se corte en hover) */}
      <div className="flex-1 overflow-y-auto p-1.5 -m-1.5">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Cargando catálogo...</span>
          </div>
        ) : totalFilteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center bg-card">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-base font-semibold text-foreground">
              No se encontraron coincidencias
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Prueba buscando otro nombre o limpia los filtros activos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 pb-4">
            {/* Productos físicos */}
            {filteredProducts.map((prod) => {
              const inCart = cart.find((it) => it.productId === prod.id);
              const price = Number(prod.baseSalePrice || 0);
              const priceBs = (price * exchangeRate).toFixed(2);
              const stock =
                prod.inventories?.reduce(
                  (acc, inv) => acc + Number(inv.currentQuantity || 0),
                  0
                ) ?? 0;

              return (
                <Card
                  key={prod.id}
                  onClick={() => handleAddProduct(prod)}
                  className={cn(
                    "group cursor-pointer border bg-card shadow-2xs hover:border-primary/60 hover:shadow-sm transition-all rounded-xl flex flex-col justify-between select-none py-0 gap-0",
                    inCart
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border"
                  )}
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal truncate max-w-[140px]"
                        >
                          {prod.category?.name || "General"}
                        </Badge>
                        {inCart ? (
                          <span className="inline-flex h-6 min-w-6 px-2 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                            {inCart.quantity} en carrito
                          </span>
                        ) : (
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          {prod.sku}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-end justify-between gap-2 mt-auto">
                      <div>
                        <div className="text-base font-bold text-foreground font-mono leading-tight">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-xs font-mono text-muted-foreground mt-0.5">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {stock <= 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
                            Agotado
                          </span>
                        ) : stock <= 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Quedan {stock}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            {stock} disp.
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Servicios / Streaming */}
            {filteredServices.map((srv) => {
              const inCart = cart.find((it) => it.serviceId === srv.id);
              const price = Number(srv.basePrice || 0);
              const priceBs = (price * exchangeRate).toFixed(2);

              return (
                <Card
                  key={srv.id}
                  onClick={() => handleAddService(srv)}
                  className={cn(
                    "group cursor-pointer border bg-card shadow-2xs hover:border-primary/60 hover:shadow-sm transition-all rounded-xl flex flex-col justify-between select-none py-0 gap-0",
                    inCart
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border"
                  )}
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        >
                          <Tv className="h-3 w-3" />
                          <span>Streaming</span>
                        </Badge>
                        {inCart ? (
                          <span className="inline-flex h-6 min-w-6 px-2 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                            {inCart.quantity} en carrito
                          </span>
                        ) : (
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {srv.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {srv.defaultDurationDays || 30} días
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-end justify-between gap-2 mt-auto">
                      <div>
                        <div className="text-base font-bold text-foreground font-mono leading-tight">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-xs font-mono text-muted-foreground mt-0.5">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground shrink-0">
                        Servicio
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
