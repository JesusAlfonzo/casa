"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { type Product, type Category, type Brand } from "@/types/inventory";
import { ProductStatsCards } from "@/components/products/product-stats-cards";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { ProductDetailSheet } from "@/components/products/product-detail-sheet";
import {
  Package,
  Search,
  Loader2,
  Plus,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  if (selectedCategory !== "ALL") params.set("categoryId", selectedCategory);
  if (selectedBrand !== "ALL") params.set("brandId", selectedBrand);
  if (statusFilter === "ACTIVE") params.set("isActive", "true");
  if (statusFilter === "INACTIVE") params.set("isActive", "false");

  const {
    data: productsRes,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      "products-list",
      page,
      debouncedSearch,
      selectedCategory,
      selectedBrand,
      statusFilter,
    ],
    queryFn: async () => {
      const res = await api.get<
        | {
            data?: Product[];
            items?: Product[];
            meta?: { total: number; totalPages: number };
            total?: number;
            totalPages?: number;
          }
        | Product[]
      >(`/products?${params.toString()}`);

      if (Array.isArray(res)) {
        return { data: res, total: res.length, totalPages: 1 };
      }
      const data = res.data || res.items || [];
      const total = res.meta?.total ?? res.total ?? data.length;
      const totalPages = res.meta?.totalPages ?? res.totalPages ?? 1;
      return { data, total, totalPages };
    },
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const res = await api.get<
        { data?: Category[]; items?: Category[] } | Category[]
      >("/categories?limit=100");
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
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
  });

  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>(
          "/exchange-rates/current"
        );
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
      }
    },
  });

  const exchangeRate = exchangeRateData || 50.0;
  const products = productsRes?.data || [];
  const total = productsRes?.total || 0;
  const totalPages = productsRes?.totalPages || 1;
  const categories = categoriesRes || [];
  const brands = brandsRes || [];

  const selectedBrandName =
    selectedBrand === "ALL"
      ? "Todas las marcas"
      : brands.find((b) => b.id === selectedBrand)?.name || "Marca";

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/products/${id}/status`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      setDeleteTarget(null);
    },
  });

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleOpenDetailSheet = (product: Product) => {
    setSelectedProductId(product.id);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra tus productos, precios en dólares y bolívares, y cuántas
            unidades tienes disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 px-4 text-sm gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span>Actualizar</span>
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo producto</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <ProductStatsCards
        products={products}
        totalFromApi={total}
        exchangeRate={exchangeRate}
      />

      {/* Filtros y Tabla */}
      <Card className="border-border shadow-2xs rounded-xl">
        <CardHeader className="p-5 sm:p-6 pb-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Buscador */}
            <div className="relative flex-1 lg:max-w-md">
              {searchTerm !== debouncedSearch ? (
                <Loader2 className="absolute left-3.5 top-3 h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Buscar por nombre, código o código de barras..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="h-10 pl-10 text-sm rounded-xl"
              />
            </div>

            {/* Filtro de marca y estado */}
            <div className="flex flex-wrap items-center gap-2.5">
              {brands.length > 0 && (
                <Select
                  value={selectedBrand}
                  onValueChange={(val) => {
                    setSelectedBrand(val || "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44 h-10 text-sm">
                    <SelectValue>{selectedBrandName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las marcas</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-1.5">
                <Button
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  className="h-9 px-3.5 text-sm rounded-xl"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "ACTIVE" ? "default" : "outline"}
                  className="h-9 px-3.5 text-sm rounded-xl"
                  onClick={() => {
                    setStatusFilter("ACTIVE");
                    setPage(1);
                  }}
                >
                  Activos
                </Button>
                <Button
                  variant={statusFilter === "INACTIVE" ? "default" : "outline"}
                  className="h-9 px-3.5 text-sm rounded-xl"
                  onClick={() => {
                    setStatusFilter("INACTIVE");
                    setPage(1);
                  }}
                >
                  Inactivos
                </Button>
              </div>
            </div>
          </div>

          {/* Barra rápida de categorías */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/60">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1 shrink-0">
                <Tag className="h-3.5 w-3.5" />
                <span>Categoría:</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setPage(1);
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 border",
                  selectedCategory === "ALL"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                )}
              >
                Todas
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(isSelected ? "ALL" : cat.id);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 border",
                      isSelected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <Table className="min-w-[780px] w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="py-3.5 px-5 text-sm font-semibold">
                    Producto
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                    Precio de venta
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-sm font-semibold">
                    Existencia (Stock)
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-sm font-semibold">
                    Estado
                  </TableHead>
                  <TableHead className="py-3.5 px-5 text-right text-sm font-semibold">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Cargando productos...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-9 w-9 text-muted-foreground" />
                        <span className="text-base font-semibold text-foreground">
                          No se encontraron productos
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {searchTerm || selectedCategory !== "ALL"
                            ? "Prueba limpiando la búsqueda o cambiando de categoría."
                            : "Agrega tu primer producto con el botón «Nuevo producto»."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const totalStock = (product.inventories || []).reduce(
                      (acc, inv) => acc + Number(inv.currentQuantity || 0),
                      0
                    );
                    const totalReserved = (product.inventories || []).reduce(
                      (acc, inv) => acc + Number(inv.reservedQuantity || 0),
                      0
                    );
                    const available = Math.max(0, totalStock - totalReserved);
                    const minAlert = Number(product.minStockAlert || 0);
                    const isCritical = minAlert > 0 && available <= minAlert;
                    const isOutOfStock = available <= 0;

                    const price = Number(product.baseSalePrice || 0);
                    const priceBs = (price * exchangeRate).toFixed(2);
                    const cost = Number(product.averageCost || 0);
                    const margin =
                      price > 0
                        ? (((price - cost) / price) * 100).toFixed(0)
                        : "0";
                    const unitAbbr =
                      product.measurementUnit?.abbreviation || "und.";

                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/60"
                        onClick={() => handleOpenDetailSheet(product)}
                      >
                        {/* Producto */}
                        <TableCell className="py-4 px-5">
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <span className="font-semibold text-sm text-foreground line-clamp-1">
                              {product.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {product.category?.name && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal px-2 py-0"
                                >
                                  {product.category.name}
                                </Badge>
                              )}
                              {product.brand?.name && (
                                <span>{product.brand.name}</span>
                              )}
                              <span className="font-mono text-muted-foreground/80">
                                {product.sku}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Precio y ganancia */}
                        <TableCell className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-base text-foreground font-mono">
                              ${price.toFixed(2)}
                            </span>
                            {exchangeRate > 1 && (
                              <span className="text-xs font-mono text-muted-foreground">
                                Bs. {priceBs}
                              </span>
                            )}
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              {cost > 0
                                ? `Costo $${cost.toFixed(2)} • +${margin}%`
                                : "Sin costo cargado"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Existencia (Stock) */}
                        <TableCell className="py-4 px-4 text-center">
                          {isOutOfStock ? (
                            <Badge
                              variant="destructive"
                              className="text-xs font-semibold px-3 py-1"
                            >
                              Agotado (0)
                            </Badge>
                          ) : isCritical ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1"
                            >
                              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                              Quedan {available} {unitAbbr}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1"
                            >
                              {available} {unitAbbr}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="py-4 px-4 text-center">
                          {product.isActive ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                            >
                              Activo
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell
                          className="py-4 px-5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-2.5 text-sm gap-1.5"
                              onClick={() => handleOpenDetailSheet(product)}
                            >
                              <Eye className="h-4 w-4" />
                              <span>Ver</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleOpenEditModal(product)}
                              title="Editar producto"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    aria-label="Más opciones"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs">
                                  Opciones
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDetailSheet(product)}
                                  className="text-sm gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(product)}
                                  className="text-sm gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Editar producto
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleStatusMutation.mutate(product.id)
                                  }
                                  className="text-sm gap-2"
                                >
                                  <Power className="h-4 w-4" />
                                  {product.isActive ? "Desactivar" : "Activar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(product)}
                                  className="text-sm gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3.5 text-sm text-muted-foreground mt-3">
              <span>
                Total: <strong>{total}</strong> productos
              </span>
              <div className="flex items-center gap-2">
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear / Editar */}
      <ProductFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
      />

      {/* Panel de Detalle */}
      <ProductDetailSheet
        productId={selectedProductId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEditProduct={(p) => {
          setIsDetailOpen(false);
          handleOpenEditModal(p);
        }}
        exchangeRate={exchangeRate}
      />

      {/* Confirmación de Eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3 pr-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Eliminar producto
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Confirma si deseas quitar{" "}
                  <strong className="text-foreground">
                    {deleteTarget?.name}
                  </strong>
                  .
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-sm text-muted-foreground leading-relaxed">
            Si este producto ya tiene ventas o compras registradas, se
            desactivará para no perder el historial. Si no tiene movimientos, se
            eliminará por completo.
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
              className="h-10 px-5 text-sm font-medium gap-2"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
