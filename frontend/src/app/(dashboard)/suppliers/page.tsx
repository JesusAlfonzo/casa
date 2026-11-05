"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type PaginatedSuppliersResponse,
  type SupplierItem,
} from "@/types/supplier";
import { SupplierFormModal } from "@/components/suppliers/supplier-form-modal";
import { SupplierDetailSheet } from "@/components/suppliers/supplier-detail-sheet";
import { LinkProductModal } from "@/components/suppliers/link-product-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  PackagePlus,
  Power,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
  Mail,
  Phone,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [linkProductModalOpen, setLinkProductModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierItem | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);

  // Fetch suppliers
  const { data: responseData, isLoading: loadingSuppliers, refetch, isFetching: fetchingSuppliers } =
    useQuery<PaginatedSuppliersResponse>({
      queryKey: ["suppliers", page, limit, debouncedSearch, statusFilter],
      queryFn: () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
        if (statusFilter === "ACTIVE") params.append("isActive", "true");
        if (statusFilter === "INACTIVE") params.append("isActive", "false");

        return api.get(`/suppliers?${params.toString()}`);
      },
    });

  const suppliers = responseData?.data || [];
  const meta = responseData?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch<{ message?: string }>(`/suppliers/${id}/status`),
    onSuccess: () => {
      toast.success("Estado del proveedor actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al actualizar estado");
    },
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ message?: string }>(`/suppliers/${id}`),
    onSuccess: (res) => {
      toast.success(res?.message || "Proveedor procesado correctamente");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al eliminar proveedor");
    },
  });

  const confirmDelete = () => {
    if (!supplierToDelete) return;
    deleteMutation.mutate(supplierToDelete.id);
  };

  // Metrics
  const activeCount = suppliers.filter((s) => s.isActive).length;
  const withPurchasesCount = suppliers.filter(
    (s) => (s._count?.purchases || 0) > 0
  ).length;
  const withProductsCount = suppliers.filter(
    (s) => (s._count?.products || 0) > 0
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Directorio de Proveedores
            </h1>
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Cadena de Suministro
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión comercial de proveedores, condiciones de compra y catálogo de productos vinculados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={fetchingSuppliers}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", fetchingSuppliers && "animate-spin")}
            />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSupplierToEdit(null);
              setFormModalOpen(true);
            }}
            className="gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Proveedores
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-foreground">{meta.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Empresas y fabricantes registrados
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Proveedores Activos
            </CardTitle>
            <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Disponibles para compras y órdenes
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Órdenes Emitidas
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {withPurchasesCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Proveedores con historial de compra
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Productos Vinculados
            </CardTitle>
            <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-foreground">
              {withProductsCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Catálogo activo de suministro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card with Search & Filters */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razón social, nombre comercial o RIF..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 text-xs"
              />
              {(search !== debouncedSearch || fetchingSuppliers) && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Solo Activos</option>
                <option value="INACTIVE">Solo Inactivos</option>
              </select>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                Total: <strong>{meta.total}</strong>
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="w-full overflow-hidden">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Proveedor / Razón Social
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contacto
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                    Dirección
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Catálogo / Compras
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Estado
                  </TableHead>
                  <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSuppliers ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Cargando proveedores...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          No se encontraron proveedores
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {debouncedSearch
                            ? "Prueba modificando los términos de búsqueda o filtros."
                            : "Registra un nuevo proveedor con el botón superior."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id} className="transition-colors hover:bg-muted/40">
                      {/* Legal name & trade name & tax ID */}
                      <TableCell className="py-3.5 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">
                            {s.legalName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.taxId && (
                              <span className="font-mono text-[10px] bg-muted px-1 py-0.2 rounded text-muted-foreground">
                                {s.taxId}
                              </span>
                            )}
                            {s.tradeName && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {s.tradeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="py-3.5 px-4">
                        <div className="space-y-0.5 text-xs">
                          {s.contactName && (
                            <div className="font-medium text-foreground text-[11px]">
                              {s.contactName}
                            </div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{s.email}</span>
                            </div>
                          )}
                          {!s.contactName && !s.phone && !s.email && (
                            <span className="text-muted-foreground italic text-[11px]">
                              Sin contacto
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Address */}
                      <TableCell className="py-3.5 px-4 text-xs text-muted-foreground hidden lg:table-cell">
                        <span className="line-clamp-1">{s.address || "—"}</span>
                      </TableCell>

                      {/* Activity */}
                      <TableCell className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/5 text-primary text-xs font-semibold"
                          >
                            <Package className="mr-1 h-3 w-3" /> {s._count?.products || 0}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
                          >
                            <ShoppingBag className="mr-1 h-3 w-3" /> {s._count?.purchases || 0}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 px-4 text-center">
                        {s.isActive ? (
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

                      {/* Actions */}
                      <TableCell className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplier(s);
                              setDetailSheetOpen(true);
                            }}
                            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            title="Ver ficha y catálogo"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Más opciones"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSupplier(s);
                                  setDetailSheetOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                Ver Ficha y Catálogo
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSupplier(s);
                                  setLinkProductModalOpen(true);
                                }}
                                className="gap-2"
                              >
                                <PackagePlus className="h-3.5 w-3.5 text-emerald-600" />
                                Vincular Producto
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSupplierToEdit(s);
                                  setFormModalOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                Editar Información
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate(s.id)}
                                className={cn(
                                  "gap-2",
                                  s.isActive
                                    ? "text-amber-600 focus:text-amber-600"
                                    : "text-emerald-600 focus:text-emerald-600"
                                )}
                              >
                                <Power className="h-3.5 w-3.5" />
                                {s.isActive ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSupplierToDelete(s);
                                  setDeleteDialogOpen(true);
                                }}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar Proveedor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Página {meta.page} de {meta.totalPages} ({meta.total} proveedores)
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!meta.hasPreviousPage}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                  disabled={!meta.hasNextPage}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Form Modal */}
      <SupplierFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        supplierToEdit={supplierToEdit}
      />

      {/* Supplier Detail Sheet */}
      <SupplierDetailSheet
        supplierId={selectedSupplier?.id || null}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={() => {
          setDetailSheetOpen(false);
          setSupplierToEdit(selectedSupplier);
          setFormModalOpen(true);
        }}
        onLinkProduct={() => {
          setDetailSheetOpen(false);
          setLinkProductModalOpen(true);
        }}
      />

      {/* Link Product Modal */}
      <LinkProductModal
        supplier={selectedSupplier}
        open={linkProductModalOpen}
        onOpenChange={setLinkProductModalOpen}
      />

      {/* Delete Supplier Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base">Eliminar Proveedor</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              ¿Está seguro de que desea eliminar al proveedor{" "}
              <strong className="text-foreground">{supplierToDelete?.legalName}</strong>?
            </DialogDescription>
          </DialogHeader>

          {supplierToDelete && (supplierToDelete._count?.purchases || 0) > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              <strong>Nota de Auditoría:</strong> Este proveedor tiene {supplierToDelete._count?.purchases} compra(s) asociada(s).
              Para preservar los libros contables y Kardex, el sistema realizará una desactivación lógica (soft-delete).
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
