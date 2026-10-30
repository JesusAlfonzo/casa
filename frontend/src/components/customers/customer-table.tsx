"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Customer } from "@/types/customer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Search,
  MoreVertical,
  User,
  Mail,
  Tv,
  ShoppingCart,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  statusFilter: "ALL" | "ACTIVE" | "INACTIVE";
  onStatusFilterChange: (status: "ALL" | "ACTIVE" | "INACTIVE") => void;
  onPageChange: (page: number) => void;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  isLoading,
  page,
  totalPages,
  total,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onSelectCustomer,
  onEditCustomer,
}: CustomerTableProps) {
  const queryClient = useQueryClient();

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch<{ success: boolean; data: Customer }>(
        `/api/customers/${id}/status`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{
        success: boolean;
        message: string;
        isSoftDeleted: boolean;
      }>(`/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteTarget(null);
    },
  });

  const getInitials = (name: string, lastName?: string | null) => {
    const first = name ? name[0].toUpperCase() : "C";
    const last = lastName ? lastName[0].toUpperCase() : "";
    return `${first}${last}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent, phone?: string | null) => {
    e.stopPropagation();
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            className="pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className="text-xs"
            onClick={() => onStatusFilterChange("ALL")}
          >
            Todos
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            className="text-xs"
            onClick={() => onStatusFilterChange("ACTIVE")}
          >
            Activos
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "INACTIVE" ? "default" : "outline"}
            className="text-xs"
            onClick={() => onStatusFilterChange("INACTIVE")}
          >
            Inactivos
          </Button>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Cliente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono / WhatsApp</TableHead>
              <TableHead className="text-center">Streaming</TableHead>
              <TableHead className="text-center">Ventas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs text-muted-foreground">
                      Cargando clientes...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      No se encontraron clientes
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {searchTerm
                        ? "Prueba cambiando el término de búsqueda o el filtro."
                        : "Registra tu primer cliente usando el botón superior."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const subCount = customer._count?.subscriptions || 0;
                const salesCount = customer._count?.sales || 0;

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => onSelectCustomer(customer)}
                  >
                    {/* Cliente Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border text-xs font-semibold">
                          <AvatarFallback>
                            {getInitials(customer.name, customer.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">
                            {customer.name} {customer.lastName || ""}
                          </span>
                          {customer.email ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Sin correo
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Documento */}
                    <TableCell>
                      {customer.documentId ? (
                        <span className="font-mono text-xs font-medium text-foreground">
                          {customer.documentId}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Teléfono & WhatsApp */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground font-medium">
                            {customer.phone}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={(e) =>
                              handleWhatsAppClick(e, customer.phone)
                            }
                            title="Abrir chat en WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Suscripciones Streaming */}
                    <TableCell className="text-center">
                      {subCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold"
                        >
                          <Tv className="mr-1 h-3 w-3" />
                          {subCount} {subCount === 1 ? "pantalla" : "pantallas"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    {/* Ventas POS */}
                    <TableCell className="text-center">
                      {salesCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          {salesCount}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      {customer.isActive ? (
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
                              aria-label="Abrir opciones de cliente"
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
                            onClick={() => onSelectCustomer(customer)}
                            className="text-xs gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Perfil 360°
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditCustomer(customer)}
                            className="text-xs gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Editar Cliente
                          </DropdownMenuItem>
                          {customer.phone && (
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleWhatsAppClick(e, customer.phone)
                              }
                              className="text-xs gap-2 text-emerald-600 dark:text-emerald-400"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Contactar WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              toggleStatusMutation.mutate(customer.id)
                            }
                            className="text-xs gap-2"
                          >
                            <Power className="h-4 w-4" />
                            {customer.isActive ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(customer)}
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar Cliente
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando <strong>{customers.length}</strong> de{" "}
            <strong>{total}</strong> clientes
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
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar cliente?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar a{" "}
                <strong>
                  {deleteTarget?.name} {deleteTarget?.lastName || ""}
                </strong>
                .
              </p>
              {(deleteTarget?._count?.sales || 0) > 0 ||
              (deleteTarget?._count?.subscriptions || 0) > 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  Este cliente posee historial comercial registrado (
                  {deleteTarget?._count?.sales || 0} ventas y{" "}
                  {deleteTarget?._count?.subscriptions || 0} suscripciones). Por
                  política de integridad contable, el sistema realizará un{" "}
                  <strong>borrado lógico (soft-delete)</strong> desactivándolo de
                  forma segura sin alterar los registros históricos.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Este cliente no posee transacciones asociadas y será
                  removido completamente de la base de datos.
                </p>
              )}
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
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? "Eliminando..."
                : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
