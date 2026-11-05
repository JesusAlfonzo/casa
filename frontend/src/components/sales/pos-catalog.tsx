"use client";

import React, { useState } from "react";
import { type ProductCatalogItem, type ServiceCatalogItem, type CartItem } from "@/types/pos";
import {
  Search,
  Package,
  Tv,
  Plus,
  AlertCircle,
  LayoutGrid,
  X,
  Loader2,
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

  // Handle direct barcode scanner enter
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
    const totalStock = prod.inventories?.reduce(
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

  // Filter items using debounced term
  const term = debouncedSearchTerm.toLowerCase().trim();

  const filteredProducts = products.filter((p) => {
    if (tab === "SERVICES") return false;
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  const filteredServices = services.filter((s) => {
    if (tab === "PRODUCTS") return false;
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term)
    );
  });

  const totalFilteredCount = filteredProducts.length + filteredServices.length;

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Search and Filters Header */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Escanear código de barra (Enter) o buscar por producto / SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            className="pl-10 pr-10 h-10 text-sm bg-card rounded-xl border-border/80 shadow-2xs focus-visible:ring-1"
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

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Button
            type="button"
            variant={tab === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("ALL")}
            className="rounded-xl px-3 h-8 gap-1.5 shadow-2xs text-xs font-semibold"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Todos ({products.length + services.length})</span>
          </Button>
          <Button
            type="button"
            variant={tab === "PRODUCTS" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("PRODUCTS")}
            className="rounded-xl px-3 h-8 gap-1.5 shadow-2xs text-xs font-semibold"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Físicos ({products.length})</span>
          </Button>
          <Button
            type="button"
            variant={tab === "SERVICES" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("SERVICES")}
            className="rounded-xl px-3 h-8 gap-1.5 shadow-2xs text-xs font-semibold"
          >
            <Tv className="h-3.5 w-3.5" />
            <span>Streaming & Servicios ({services.length})</span>
          </Button>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Cargando catálogo para venta...</span>
          </div>
        ) : totalFilteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">
              No se encontraron coincidencias
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
              Prueba buscando por SKU, código o limpia el filtro de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
            {/* Products */}
            {filteredProducts.map((prod) => {
              const inCart = cart.find((it) => it.productId === prod.id);
              const price = Number(prod.baseSalePrice || 0);
              const priceBs = (price * exchangeRate).toFixed(2);
              const stock = prod.inventories?.reduce(
                (acc, inv) => acc + Number(inv.currentQuantity || 0),
                0
              ) ?? 0;

              return (
                <Card
                  key={prod.id}
                  onClick={() => handleAddProduct(prod)}
                  className={cn(
                    "group cursor-pointer border-border/80 bg-card shadow-xs hover:border-primary/50 hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col justify-between select-none",
                    inCart ? "ring-2 ring-primary/50 bg-primary/5" : ""
                  )}
                >
                  <CardContent className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Badges Row */}
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="outline" className="text-[10px] font-medium truncate max-w-[120px] bg-muted/40">
                          {prod.category?.name || "General"}
                        </Badge>
                        {inCart ? (
                          <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                            {inCart.quantity} en carrito
                          </span>
                        ) : (
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Title & SKU */}
                      <div>
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          SKU: {prod.sku}
                        </p>
                      </div>
                    </div>

                    {/* Price & Stock Footer */}
                    <div className="pt-2 border-t border-border/60 flex items-end justify-between gap-2 mt-auto">
                      <div>
                        <div className="text-sm sm:text-base font-extrabold text-foreground font-mono">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        {stock <= 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            Agotado
                          </span>
                        ) : stock <= 5 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {stock} restantes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {stock} disponibles
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Services / Streaming */}
            {filteredServices.map((srv) => {
              const inCart = cart.find((it) => it.serviceId === srv.id);
              const price = Number(srv.basePrice || 0);
              const priceBs = (price * exchangeRate).toFixed(2);

              return (
                <Card
                  key={srv.id}
                  onClick={() => handleAddService(srv)}
                  className={cn(
                    "group cursor-pointer border-border/80 bg-card shadow-xs hover:border-primary/50 hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col justify-between select-none",
                    inCart ? "ring-2 ring-primary/50 bg-primary/5" : ""
                  )}
                >
                  <CardContent className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Badges Row */}
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Tv className="h-2.5 w-2.5" />
                          <span>Streaming</span>
                        </Badge>
                        {inCart ? (
                          <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                            {inCart.quantity} en carrito
                          </span>
                        ) : (
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Title & Duration */}
                      <div>
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {srv.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {srv.code} • {srv.defaultDurationDays || 30} días
                        </p>
                      </div>
                    </div>

                    {/* Price & Badge Footer */}
                    <div className="pt-2 border-t border-border/60 flex items-end justify-between gap-2 mt-auto">
                      <div>
                        <div className="text-sm sm:text-base font-extrabold text-foreground font-mono">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>

                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/30">
                        Servicio Digital
                      </Badge>
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
