"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Category, type Brand } from "@/types/inventory";
import { CategoryFormModal } from "@/components/categories/category-form-modal";
import { BrandFormModal } from "@/components/categories/brand-form-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  Layers,
  Tag,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function CategoriesAndBrandsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");

  // Search states with debouncing
  const [searchCategory, setSearchCategory] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const debouncedSearchCategory = useDebounce(searchCategory, 400);
  const debouncedSearchBrand = useDebounce(searchBrand, 400);

  // Pagination states
  const [categoryPage, setCategoryPage] = useState(1);
  const categoryLimit = 10;
  const [brandPage, setBrandPage] = useState(1);
  const brandLimit = 10;

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Deletion state
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [deleteBrandTarget, setDeleteBrandTarget] = useState<Brand | null>(null);

  // Queries
  const {
    data: categoriesRes,
    isLoading: loadingCategories,
    refetch: refetchCategories,
    isFetching: fetchingCategories,
  } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await api.get<{ data?: Category[]; items?: Category[] } | Category[]>(
        "/categories?limit=100"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  const {
    data: brandsRes,
    isLoading: loadingBrands,
    refetch: refetchBrands,
    isFetching: fetchingBrands,
  } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const res = await api.get<{ data?: Brand[]; items?: Brand[] } | Brand[]>(
        "/brands?limit=100"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  const categories = categoriesRes || [];
  const brands = brandsRes || [];

  // Filtered lists (safe against undefined properties)
  const filteredCategories = categories.filter((c) => {
    const term = debouncedSearchCategory.toLowerCase().trim();
    if (!term) return true;
    return (
      Boolean(c.name && c.name.toLowerCase().includes(term)) ||
      Boolean(c.slug && c.slug.toLowerCase().includes(term)) ||
      Boolean(c.code && c.code.toLowerCase().includes(term)) ||
      Boolean(c.description && c.description.toLowerCase().includes(term))
    );
  });

  const totalCategoryPages = Math.ceil(filteredCategories.length / categoryLimit) || 1;
  const paginatedCategories = filteredCategories.slice(
    (categoryPage - 1) * categoryLimit,
    categoryPage * categoryLimit
  );

  const filteredBrands = brands.filter((b) => {
    const term = debouncedSearchBrand.toLowerCase().trim();
    if (!term) return true;
    return (
      Boolean(b.name && b.name.toLowerCase().includes(term)) ||
      Boolean(b.description && b.description.toLowerCase().includes(term))
    );
  });

  const totalBrandPages = Math.ceil(filteredBrands.length / brandLimit) || 1;
  const paginatedBrands = filteredBrands.slice(
    (brandPage - 1) * brandLimit,
    brandPage * brandLimit
  );

  // Category Mutations
  const toggleCategoryStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/categories/${id}/status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-all"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-all"] });
      setDeleteCategoryTarget(null);
    },
  });

  // Brand Mutations
  const toggleBrandStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/brands/${id}/status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands-list"] });
      queryClient.invalidateQueries({ queryKey: ["brands-all"] });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands-list"] });
      queryClient.invalidateQueries({ queryKey: ["brands-all"] });
      setDeleteBrandTarget(null);
    },
  });

  // Category KPIs
  const totalCategories = categories.length;
  const rootCategories = categories.filter((c) => !c.parentId && !c.parentCategoryId).length;
  const subCategories = totalCategories - rootCategories;
  const activeCategories = categories.filter((c) => c.isActive).length;

  // Brand KPIs
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b) => b.isActive).length;
  const brandsWithProducts = brands.filter((b) => (b._count?.products || 0) > 0).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Categorías y Marcas
            </h1>
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Estructura de Catálogo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Clasifica y organiza tus productos físicos y líneas comerciales por familias y marcas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchCategories();
              refetchBrands();
            }}
            disabled={fetchingCategories || fetchingBrands}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (fetchingCategories || fetchingBrands) && "animate-spin"
              )}
            />
            Actualizar
          </Button>

          {activeTab === "categories" ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Nueva Categoría
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingBrand(null);
                setIsBrandModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Nueva Marca
            </Button>
          )}
        </div>
      </div>

      {/* Selection Cards Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
            activeTab === "categories"
              ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                activeTab === "categories"
                  ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Categorías</div>
              <div className="text-xs text-muted-foreground">
                Familias y subcategorías
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5",
              activeTab === "categories"
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                : "text-muted-foreground"
            )}
          >
            {categories.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("brands")}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
            activeTab === "brands"
              ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                activeTab === "brands"
                  ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Marcas</div>
              <div className="text-xs text-muted-foreground">
                Fabricantes y líneas comerciales
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5",
              activeTab === "brands"
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                : "text-muted-foreground"
            )}
          >
            {brands.length}
          </Badge>
        </button>
      </div>

      {/* Tab 1: Categorías */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Category KPIs */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Categorías
                </CardTitle>
                <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
                  <Layers className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{totalCategories}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Líneas de producto registradas
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Categorías Raíz
                </CardTitle>
                <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
                  <Layers className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{rootCategories}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Departamentos principales
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Subcategorías
                </CardTitle>
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
                  <Layers className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{subCategories}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nivel secundario / dependientes
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Categorías Activas
                </CardTitle>
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
                  <Layers className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{activeCategories}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Habilitadas en POS y catálogo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Categories Table Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código o descripción..."
                    value={searchCategory}
                    onChange={(e) => {
                      setSearchCategory(e.target.value);
                      setCategoryPage(1);
                    }}
                    className="pl-9 pr-8 text-xs"
                  />
                  {searchCategory !== debouncedSearchCategory && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Mostrando {filteredCategories.length} de {categories.length} categorías
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Categoría
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Jerarquía
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                        Descripción
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Productos
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCategories ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              Cargando categorías...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Layers className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No se encontraron categorías
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearchCategory
                                ? "Prueba con otro término de búsqueda"
                                : "Crea una nueva categoría para comenzar."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCategories.map((cat) => {
                        const prodCount = cat._count?.products || 0;
                        const parent =
                          cat.parentCategory ||
                          categories.find((c) => c.id === (cat.parentId || cat.parentCategoryId));

                        return (
                          <TableRow key={cat.id} className="transition-colors hover:bg-muted/40">
                            <TableCell className="py-3.5 px-5">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground">
                                  {cat.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {cat.code && (
                                    <span className="font-mono text-[10px] bg-muted px-1 py-0.2 rounded text-muted-foreground">
                                      #{cat.code}
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    {cat.slug}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 px-4">
                              {parent ? (
                                <Badge variant="outline" className="text-[10px] font-medium">
                                  {parent.name}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">
                                  Categoría Raíz
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {cat.description || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-center">
                              <Badge
                                variant="outline"
                                className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                              >
                                <Package className="mr-1 h-3 w-3" />
                                {prodCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5 px-4">
                              {cat.isActive ? (
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
                            <TableCell className="py-3.5 px-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      aria-label="Opciones de categoría"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuLabel className="text-xs">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingCategory(cat);
                                      setIsCategoryModalOpen(true);
                                    }}
                                    className="text-xs gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Editar Categoría
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleCategoryStatusMutation.mutate(cat.id)
                                    }
                                    className="text-xs gap-2"
                                  >
                                    <Power className="h-4 w-4" />
                                    {cat.isActive ? "Desactivar" : "Activar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteCategoryTarget(cat)}
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

                {/* Categories Pagination */}
                <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
                  <span className="text-xs text-muted-foreground">
                    Página {categoryPage} de {totalCategoryPages} ({filteredCategories.length} categorías)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage((p) => Math.max(p - 1, 1))}
                      disabled={categoryPage <= 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage((p) => Math.min(p + 1, totalCategoryPages))}
                      disabled={categoryPage >= totalCategoryPages}
                      className="h-8 text-xs"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Marcas */}
      {activeTab === "brands" && (
        <div className="space-y-6">
          {/* Brand KPIs */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Marcas
                </CardTitle>
                <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
                  <Tag className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{totalBrands}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fabricantes y marcas en catálogo
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Marcas Activas
                </CardTitle>
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
                  <Tag className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{activeBrands}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disponibles para nuevos productos
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Con Productos Asociados
                </CardTitle>
                <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
                  <Package className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{brandsWithProducts}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Marcas con inventario asignado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Brands Table Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar marca por nombre o descripción..."
                    value={searchBrand}
                    onChange={(e) => {
                      setSearchBrand(e.target.value);
                      setBrandPage(1);
                    }}
                    className="pl-9 pr-8 text-xs"
                  />
                  {searchBrand !== debouncedSearchBrand && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Mostrando {filteredBrands.length} de {brands.length} marcas
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nombre de la Marca
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Descripción
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Productos
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBrands ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              Cargando marcas...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredBrands.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Tag className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No se encontraron marcas
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearchBrand
                                ? "Prueba con otro término de búsqueda"
                                : "Registra una nueva marca con el botón superior."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBrands.map((brand) => {
                        const prodCount = brand._count?.products || 0;

                        return (
                          <TableRow key={brand.id} className="transition-colors hover:bg-muted/40">
                            <TableCell className="py-3.5 px-5 font-semibold text-xs text-foreground">
                              {brand.name}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">
                              {brand.description || "—"}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-center">
                              <Badge
                                variant="outline"
                                className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                              >
                                <Package className="mr-1 h-3 w-3" />
                                {prodCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5 px-4">
                              {brand.isActive ? (
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
                            <TableCell className="py-3.5 px-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      aria-label="Opciones de marca"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuLabel className="text-xs">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingBrand(brand);
                                      setIsBrandModalOpen(true);
                                    }}
                                    className="text-xs gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Editar Marca
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleBrandStatusMutation.mutate(brand.id)
                                    }
                                    className="text-xs gap-2"
                                  >
                                    <Power className="h-4 w-4" />
                                    {brand.isActive ? "Desactivar" : "Activar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteBrandTarget(brand)}
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

                {/* Brands Pagination */}
                <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
                  <span className="text-xs text-muted-foreground">
                    Página {brandPage} de {totalBrandPages} ({filteredBrands.length} marcas)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBrandPage((p) => Math.max(p - 1, 1))}
                      disabled={brandPage <= 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBrandPage((p) => Math.min(p + 1, totalBrandPages))}
                      disabled={brandPage >= totalBrandPages}
                      className="h-8 text-xs"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Modal */}
      <CategoryFormModal
        open={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        category={editingCategory}
        existingCategories={categories}
      />

      {/* Brand Modal */}
      <BrandFormModal
        open={isBrandModalOpen}
        onOpenChange={setIsBrandModalOpen}
        brand={editingBrand}
      />

      {/* Delete Category Dialog */}
      <Dialog
        open={Boolean(deleteCategoryTarget)}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
      >
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar categoría?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar la categoría{" "}
                <strong className="text-foreground">{deleteCategoryTarget?.name}</strong>
                {deleteCategoryTarget?.slug ? ` (${deleteCategoryTarget.slug})` : ""}.
              </p>
              {(deleteCategoryTarget?._count?.products || 0) > 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Esta categoría tiene {deleteCategoryTarget?._count?.products} productos
                  asociados. Se aplicará borrado lógico o desvinculación para proteger la integridad.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Esta categoría no posee productos asociados y será eliminada de forma segura.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCategoryTarget(null)}
              disabled={deleteCategoryMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteCategoryTarget &&
                deleteCategoryMutation.mutate(deleteCategoryTarget.id)
              }
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? "Eliminando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Dialog */}
      <Dialog
        open={Boolean(deleteBrandTarget)}
        onOpenChange={(open) => !open && setDeleteBrandTarget(null)}
      >
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar marca?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar la marca{" "}
                <strong className="text-foreground">{deleteBrandTarget?.name}</strong>.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteBrandTarget(null)}
              disabled={deleteBrandMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteBrandTarget &&
                deleteBrandMutation.mutate(deleteBrandTarget.id)
              }
              disabled={deleteBrandMutation.isPending}
            >
              {deleteBrandMutation.isPending ? "Eliminando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
