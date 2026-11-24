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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
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
  isSearching?: boolean;
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
  isSearching = false,
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
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

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
      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          {isSearching ? (
            <Loader2 className="absolute left-3.5 top-3 h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o correo..."
            className="h-10 pl-10 text-sm bg-card rounded-xl"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className="h-9 px-4 text-sm rounded-xl"
            onClick={() => onStatusFilterChange("ALL")}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            className="h-9 px-4 text-sm rounded-xl"
            onClick={() => onStatusFilterChange("ACTIVE")}
          >
            Activos
          </Button>
          <Button
            variant={statusFilter === "INACTIVE" ? "default" : "outline"}
            className="h-9 px-4 text-sm rounded-xl"
            onClick={() => onStatusFilterChange("INACTIVE")}
          >
            Inactivos
          </Button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="rounded-xl border border-border bg-card shadow-2xs overflow-x-auto">
        <Table className="min-w-[820px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="w-[280px] py-3.5 px-5 text-sm font-semibold">
                Cliente
              </TableHead>
              <TableHead className="py-3.5 px-4 text-sm font-semibold">
                Cédula
              </TableHead>
              <TableHead className="py-3.5 px-4 text-sm font-semibold">
                Teléfono / WhatsApp
              </TableHead>
              <TableHead className="py-3.5 px-4 text-sm font-semibold text-center">
                Streaming
              </TableHead>
              <TableHead className="py-3.5 px-4 text-sm font-semibold text-center">
                Compras
              </TableHead>
              <TableHead className="py-3.5 px-4 text-sm font-semibold">
                Estado
              </TableHead>
              <TableHead className="py-3.5 px-5 text-sm font-semibold text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
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
                    <span className="text-base font-medium text-foreground">
                      No se encontraron clientes
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {searchTerm
                        ? "Prueba buscando con otro nombre o número."
                        : "Registra tu primer cliente usando el botón «Nuevo cliente»."}
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
                    className="cursor-pointer transition-colors hover:bg-muted/40 border-b border-border/60"
                    onClick={() => onSelectCustomer(customer)}
                  >
                    {/* Cliente */}
                    <TableCell className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border text-sm font-semibold">
                          <AvatarFallback>
                            {getInitials(customer.name, customer.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {customer.name} {customer.lastName || ""}
                          </span>
                          {customer.email ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              Sin correo
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Cédula */}
                    <TableCell className="py-4 px-4 text-sm">
                      {customer.documentId ? (
                        <span className="font-mono font-medium text-foreground">
                          {customer.documentId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Teléfono / WhatsApp */}
                    <TableCell
                      className="py-4 px-4 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {customer.phone}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={(e) =>
                              handleWhatsAppClick(e, customer.phone)
                            }
                            title="Escribir por WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Streaming */}
                    <TableCell className="py-4 px-4 text-center">
                      {subCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium"
                        >
                          <Tv className="mr-1 h-3.5 w-3.5" />
                          {subCount} {subCount === 1 ? "pantalla" : "pantallas"}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    {/* Compras */}
                    <TableCell className="py-4 px-4 text-center">
                      {salesCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium"
                        >
                          <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                          {salesCount}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="py-4 px-4">
                      {customer.isActive ? (
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
                          onClick={() => onSelectCustomer(customer)}
                        >
                          <Eye className="h-4 w-4" />
                          <span>Ver</span>
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
                              onClick={() => onSelectCustomer(customer)}
                              className="text-sm gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver ficha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditCustomer(customer)}
                              className="text-sm gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar datos
                            </DropdownMenuItem>
                            {customer.phone && (
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleWhatsAppClick(e, customer.phone)
                                }
                                className="text-sm gap-2 text-emerald-600 dark:text-emerald-400"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Escribir por WhatsApp
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatusMutation.mutate(customer.id)
                              }
                              className="text-sm gap-2"
                            >
                              <Power className="h-4 w-4" />
                              {customer.isActive ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(customer)}
                              className="text-sm gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar cliente
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-sm text-muted-foreground bg-muted/20">
            <span>
              Mostrando <strong>{customers.length}</strong> de{" "}
              <strong>{total}</strong> clientes
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
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de eliminación */}
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
                  Eliminar cliente
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Confirma si deseas quitar a{" "}
                  <strong className="text-foreground">
                    {deleteTarget?.name} {deleteTarget?.lastName || ""}
                  </strong>
                  .
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 text-sm">
            {(deleteTarget?._count?.sales || 0) > 0 ||
            (deleteTarget?._count?.subscriptions || 0) > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300 leading-relaxed">
                Este cliente ya tiene{" "}
                <strong>{deleteTarget?._count?.sales || 0} ventas</strong> y{" "}
                <strong>
                  {deleteTarget?._count?.subscriptions || 0} suscripciones
                </strong>{" "}
                registradas. Se desactivará para no perder su historial de
                pagos.
              </div>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                Este cliente no tiene ventas ni suscripciones registradas, por
                lo que se borrará por completo.
              </p>
            )}
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
