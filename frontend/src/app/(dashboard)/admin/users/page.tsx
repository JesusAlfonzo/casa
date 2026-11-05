"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type PaginatedUsersResponse,
  type UserSummaryItem,
  type RoleDetail,
} from "@/types/rbac";
import { UserFormModal } from "@/components/admin/users/user-form-modal";
import { AssignRolesModal } from "@/components/admin/users/assign-roles-modal";
import { UserDetailSheet } from "@/components/admin/users/user-detail-sheet";
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
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Search,
  Eye,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";

export default function UsersAdminPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  // Retraso de 400ms para evitar peticiones en cada tecla presionada
  const debouncedSearch = useDebounce(search, 400);

  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals & Sheets state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummaryItem | null>(null);

  // Fetch users con debouncedSearch
  const { data: usersData, isLoading: loadingUsers, refetch } =
    useQuery<PaginatedUsersResponse>({
      queryKey: [
        "admin-users",
        page,
        limit,
        debouncedSearch,
        roleFilter,
        statusFilter,
      ],
      queryFn: () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
        if (roleFilter !== "ALL") params.append("roleName", roleFilter);
        if (statusFilter === "ACTIVE") params.append("isActive", "true");
        if (statusFilter === "INACTIVE") params.append("isActive", "false");

        return api.get(`/users?${params.toString()}`);
      },
    });

  // Fetch roles for filter dropdown
  const { data: rolesData } = useQuery<{ success: boolean; data: RoleDetail[] }>({
    queryKey: ["admin-roles-list"],
    queryFn: () => api.get("/roles?isActive=true"),
  });

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const totalPages = usersData?.totalPages || 1;
  const roles = rolesData?.data || [];

  // Toggle user status
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch<{ message?: string }>(`/users/${id}/status`),
    onSuccess: (res) => {
      toast.success(res?.message || "Estado de usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail", selectedUser?.id] });
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al actualizar estado del usuario");
    },
  });

  // Calculate metrics
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Gestión de Usuarios
          </h2>
          <p className="text-sm text-muted-foreground">
            Administración de operadores, credenciales de acceso y asignación de roles.
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
            onClick={() => setCreateModalOpen(true)}
            className="h-9 shadow-xs"
          >
            <UserPlus className="h-4 w-4 mr-1.5" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Usuarios Activos
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              En esta vista
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Usuarios Suspendidos
            </CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {inactiveCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Acceso revocado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Roles Disponibles
            </CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {roles.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Perfiles en catálogo
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
                placeholder="Buscar por nombre, apellido, usuario o correo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs"
              />
              {search !== debouncedSearch && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Todos los roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
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
                <option value="INACTIVE">Suspendidos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                <TableHead className="h-12 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operador / Usuario
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contacto
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Roles Asignados
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Estado
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Último Acceso
                </TableHead>
                <TableHead className="h-12 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando usuarios del sistema...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-foreground">
                    No se encontraron usuarios registrados con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  return (
                    <TableRow key={u.id} className="hover:bg-muted/20 transition-colors border-b border-border/60">
                      {/* Name & Avatar */}
                      <TableCell className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shadow-2xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground text-sm leading-tight">
                              {u.name} {u.lastName || ""}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground block">
                              @{u.username || "sin_usuario"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="py-4 px-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </div>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Sin teléfono
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Roles */}
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {(!u.roles || u.roles.length === 0) ? (
                            <span className="text-xs text-muted-foreground italic">
                              Sin roles
                            </span>
                          ) : (
                            u.roles.map((r) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="text-[11px] px-2 py-0.5 font-medium bg-background/80 border-border/80"
                              >
                                {r.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4 px-4 text-center">
                        <Badge
                          variant={u.isActive ? "secondary" : "destructive"}
                          className="text-[11px] font-medium px-2 py-0.5"
                        >
                          {u.isActive ? "ACTIVO" : "SUSPENDIDO"}
                        </Badge>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="py-4 px-4 text-xs text-muted-foreground">
                        {u.lastLoginAt ? (
                          <div className="space-y-0.5">
                            <span className="text-foreground font-medium block">
                              {new Date(u.lastLoginAt).toLocaleDateString("es-VE")}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(u.lastLoginAt).toLocaleTimeString("es-VE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Nunca</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs shadow-2xs"
                            onClick={() => {
                              setSelectedUser(u);
                              setDetailSheetOpen(true);
                            }}
                            title="Ver Detalle Completo"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-primary" /> Ver
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs shadow-2xs"
                            onClick={() => {
                              setSelectedUser(u);
                              setRolesModalOpen(true);
                            }}
                            title="Gestionar Roles"
                          >
                            <Shield className="h-3.5 w-3.5 mr-1 text-primary" /> Roles
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 transition-colors ${
                              u.isActive
                                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            }`}
                            onClick={() => toggleStatusMutation.mutate(u.id)}
                            title={u.isActive ? "Suspender Usuario" : "Activar Acceso"}
                          >
                            {u.isActive ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <span className="text-xs text-muted-foreground">
              Mostrando página {page} de {totalPages} ({total} usuarios)
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-8 text-xs"
              >
                Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals & Sheets */}
      <UserFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <AssignRolesModal
        open={rolesModalOpen}
        onOpenChange={setRolesModalOpen}
        user={selectedUser}
      />

      <UserDetailSheet
        userId={selectedUser?.id || null}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEditRoles={() => {
          setDetailSheetOpen(false);
          setRolesModalOpen(true);
        }}
      />
    </div>
  );
}
