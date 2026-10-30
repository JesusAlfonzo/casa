"use client";

import React, { useState } from "react";
import { type ProductCatalogItem, type ServiceCatalogItem, type CartItem } from "@/types/pos";
import { Search, Package, Tv, Plus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    ) ?? 50;

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

  // Filter items
  const filteredProducts = products.filter((p) => {
    if (tab === "SERVICES") return false;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  });

  const filteredServices = services.filter((s) => {
    if (tab === "PRODUCTS") return false;
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term)
    );
  });

  const totalFilteredCount = filteredProducts.length + filteredServices.length;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search and Filters Header */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Escanear código de barra o buscar producto / servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Button
            type="button"
            variant={tab === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setTab("ALL")}
            className="rounded-full px-3"
          >
            Todos ({products.length + services.length})
          </Button>
          <Button
            type="button"
            variant={tab === "PRODUCTS" ? "default" : "outline"}
            size="xs"
            onClick={() => setTab("PRODUCTS")}
            className="rounded-full px-3 gap-1"
          >
            <Package className="h-3 w-3" />
            <span>Físicos ({products.length})</span>
          </Button>
          <Button
            type="button"
            variant={tab === "SERVICES" ? "default" : "outline"}
            size="xs"
            onClick={() => setTab("SERVICES")}
            className="rounded-full px-3 gap-1"
          >
            <Tv className="h-3 w-3" />
            <span>Streaming & Servicios ({services.length})</span>
          </Button>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando catálogo...
          </div>
        ) : totalFilteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              No se encontraron coincidencias
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prueba buscando por SKU, nombre o limpia el filtro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  className={`group cursor-pointer border-border shadow-xs hover:border-primary/60 hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                    inCart ? "ring-1 ring-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <Badge variant="outline" className="text-[10px] truncate max-w-[120px]">
                        {prod.category?.name || "General"}
                      </Badge>
                      {inCart ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {inCart.quantity}
                        </span>
                      ) : (
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-tight">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        SKU: {prod.sku}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-border/60 flex items-end justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-[10px] text-muted-foreground">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-medium ${
                          stock <= 0
                            ? "text-destructive"
                            : stock <= 5
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {stock > 0 ? `${stock} en stock` : "Sin stock"}
                      </span>
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
                  className={`group cursor-pointer border-border shadow-xs hover:border-primary/60 hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                    inCart ? "ring-1 ring-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Tv className="h-2.5 w-2.5" />
                        <span>Streaming</span>
                      </Badge>
                      {inCart ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {inCart.quantity}
                        </span>
                      ) : (
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-tight">
                        {srv.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {srv.code} • {srv.defaultDurationDays || 30} días
                      </p>
                    </div>

                    <div className="pt-1 border-t border-border/60 flex items-end justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          ${price.toFixed(2)}
                        </div>
                        {exchangeRate > 1 && (
                          <div className="text-[10px] text-muted-foreground">
                            Bs. {priceBs}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        Servicio
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
