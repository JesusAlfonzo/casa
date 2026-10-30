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
  const { data: responseData, isLoading: loadingSuppliers, refetch } =
    useQuery<PaginatedSuppliersResponse>({
      queryKey: ["suppliers", page, limit, search, statusFilter],
      queryFn: () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search.trim()) params.append("search", search.trim());
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Directorio de Proveedores
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestión comercial de proveedores, condiciones de compra y catálogo de productos vinculados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSupplierToEdit(null);
              setFormModalOpen(true);
            }}
            className="h-9 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Proveedores
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{meta.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Empresas registradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Proveedores Activos
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Disponibles para compras
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Con Órdenes Emitidas
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {withPurchasesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              En esta vista
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Con Productos Vinculados
            </CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {withProductsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Catálogo activo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razón social, nombre comercial, RIF/NIT o contacto..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">Proveedor / Razón Social</TableHead>
                <TableHead className="text-xs font-semibold">Documento / RIF</TableHead>
                <TableHead className="text-xs font-semibold">Contacto</TableHead>
                <TableHead className="text-xs font-semibold">Dirección</TableHead>
                <TableHead className="text-xs font-semibold text-center">Catálogo / Compras</TableHead>
                <TableHead className="text-xs font-semibold text-center">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSuppliers ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando proveedores...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No se encontraron proveedores registrados con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    {/* Legal name & trade name */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground text-xs block">
                          {s.legalName}
                        </span>
                        {s.tradeName && (
                          <span className="text-[11px] text-muted-foreground block">
                            {s.tradeName}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Tax ID */}
                    <TableCell className="text-xs">
                      {s.taxId ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {s.taxId}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Sin RIF
                        </span>
                      )}
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        {s.contactName && (
                          <div className="font-medium text-foreground text-[11px]">
                            {s.contactName}
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Phone className="h-3 w-3" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Mail className="h-3 w-3" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Address */}
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {s.address || "No especificada"}
                    </TableCell>

                    {/* Activity */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                          <Package className="h-3 w-3 text-primary" /> {s._count?.products || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px]">
                          <ShoppingBag className="h-3 w-3 text-emerald-500" /> {s._count?.purchases || 0}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge
                        variant={s.isActive ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {s.isActive ? "ACTIVO" : "INACTIVO"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSupplier(s);
                              setDetailSheetOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 text-primary" />
                            Ver Ficha y Catálogo
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSupplier(s);
                              setLinkProductModalOpen(true);
                            }}
                          >
                            <PackagePlus className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                            Vincular Producto
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSupplierToEdit(s);
                              setFormModalOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Editar Información
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => toggleStatusMutation.mutate(s.id)}
                            className={
                              s.isActive
                                ? "text-amber-600 focus:text-amber-600"
                                : "text-emerald-600 focus:text-emerald-600"
                            }
                          >
                            <Power className="mr-2 h-3.5 w-3.5" />
                            {s.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setSupplierToDelete(s);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar Proveedor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Mostrando página {meta.page} de {meta.totalPages} ({meta.total} proveedores)
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
        <DialogContent className="max-w-md">
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

          <DialogFooter className="pt-2">
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
