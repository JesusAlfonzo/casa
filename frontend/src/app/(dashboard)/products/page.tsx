"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type Category,
  type Brand,
} from "@/types/inventory";
import { ProductStatsCards } from "@/components/products/product-stats-cards";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { ProductDetailSheet } from "@/components/products/product-detail-sheet";
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Barcode,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modals and detail states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Queries
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (searchTerm.trim()) params.set("search", searchTerm.trim());
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
    queryKey: ["products-list", page, searchTerm, selectedCategory, selectedBrand, statusFilter],
    queryFn: async () => {
      const res = await api.get<{
        data?: Product[];
        items?: Product[];
        meta?: { total: number; totalPages: number };
        total?: number;
        totalPages?: number;
      } | Product[]>(`/products?${params.toString()}`);

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
      const res = await api.get<{ data?: Category[]; items?: Category[] } | Category[]>(
        "/categories?limit=100"
      );
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
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
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

  // Mutations
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Catálogo de Productos Físicos
            </h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Inventario Central
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestión completa de artículos, existencias multi-almacén, márgenes comerciales y alertas de reposición.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Crear Producto
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <ProductStatsCards
        products={products}
        totalFromApi={total}
        exchangeRate={exchangeRate}
      />

      {/* Filter and Table Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU, código de barras o nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Select Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por categoría"
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por marca"
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todas las Marcas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "ACTIVE" ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => {
                    setStatusFilter("ACTIVE");
                    setPage(1);
                  }}
                >
                  Activos
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "INACTIVE" ? "default" : "outline"}
                  className="h-8 text-xs"
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
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">SKU / Código</TableHead>
                  <TableHead className="w-[260px]">Producto</TableHead>
                  <TableHead>Categoría / Marca</TableHead>
                  <TableHead className="text-right">Costo Promedio</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-center">Stock Disponible</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs text-muted-foreground">
                          Cargando catálogo...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          No se encontraron productos
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {searchTerm
                            ? "Prueba cambiando el término de búsqueda o filtros."
                            : "Crea tu primer producto físico con el botón superior."}
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
                    const cost = Number(product.averageCost || 0);
                    const margin =
                      price > 0 ? (((price - cost) / price) * 100).toFixed(0) : "0";

                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleOpenDetailSheet(product)}
                      >
                        {/* SKU & Barcode */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {product.sku}
                            </span>
                            {product.barcode && (
                              <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Barcode className="h-3 w-3" />
                                {product.barcode}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Product Name */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">
                              {product.name}
                            </span>
                            {product.description && (
                              <span className="line-clamp-1 text-[11px] text-muted-foreground">
                                {product.description}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Category & Brand */}
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {product.category?.name && (
                              <Badge variant="outline" className="text-[10px]">
                                {product.category.name}
                              </Badge>
                            )}
                            {product.brand?.name && (
                              <span className="text-[11px] text-muted-foreground">
                                {product.brand.name}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Cost */}
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">
                          ${cost.toFixed(2)}
                        </TableCell>

                        {/* Price & Margin */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-xs text-foreground font-mono">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              +{margin}% margen
                            </span>
                          </div>
                        </TableCell>

                        {/* Stock Disponible */}
                        <TableCell className="text-center">
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              Agotado (0)
                            </Badge>
                          ) : isCritical ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {available} {product.measurementUnit?.abbreviation || "und."}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"
                            >
                              {available} {product.measurementUnit?.abbreviation || "und."}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          {product.isActive ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                            >
                              Activo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-muted bg-muted text-muted-foreground text-[10px]"
                            >
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label="Opciones de producto"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">
                                Acciones
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenDetailSheet(product)}
                                className="text-xs gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Existencias Almacén
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenEditModal(product)}
                                className="text-xs gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Editar Producto
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate(product.id)
                                }
                                className="text-xs gap-2"
                              >
                                <Power className="h-4 w-4" />
                                {product.isActive ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(product)}
                                className="text-xs gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-2 py-3 text-xs text-muted-foreground mt-2">
            <span>
              Total: <strong>{total}</strong> productos registrados
            </span>
            <div className="flex items-center gap-2">
              <span>
                Página {page} de {totalPages || 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      <ProductFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
      />

      {/* Product Detail Sheet */}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar producto?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar el producto{" "}
                <strong>{deleteTarget?.name}</strong> (SKU: {deleteTarget?.sku}).
              </p>
              <p className="text-xs text-muted-foreground">
                Si este producto posee compras, ventas o movimientos de inventario históricos,
                el sistema lo marcará como desactivado/archivado para preservar la integridad contable.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
