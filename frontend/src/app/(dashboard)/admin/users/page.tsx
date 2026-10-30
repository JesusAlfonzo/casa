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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Search,
  MoreVertical,
  Eye,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
} from "lucide-react";

export default function UsersAdminPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals & Sheets state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummaryItem | null>(null);

  // Fetch users
  const { data: usersData, isLoading: loadingUsers, refetch } =
    useQuery<PaginatedUsersResponse>({
      queryKey: [
        "admin-users",
        page,
        limit,
        search,
        roleFilter,
        statusFilter,
      ],
      queryFn: () => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search.trim()) params.append("search", search.trim());
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
                className="pl-9 h-9 text-xs"
              />
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">Operador / Usuario</TableHead>
                <TableHead className="text-xs font-semibold">Contacto</TableHead>
                <TableHead className="text-xs font-semibold">Roles Asignados</TableHead>
                <TableHead className="text-xs font-semibold text-center">Estado</TableHead>
                <TableHead className="text-xs font-semibold">Último Acceso</TableHead>
                <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando usuarios del sistema...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No se encontraron usuarios registrados con los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      {/* Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs">
                              {u.name} {u.lastName || ""}
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              @{u.username || "sin_usuario"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <Phone className="h-3 w-3" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Roles */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.roles.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic">
                              Sin rol
                            </span>
                          ) : (
                            u.roles.map((r) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-medium bg-background"
                              >
                                {r.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant={u.isActive ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {u.isActive ? "ACTIVO" : "SUSPENDIDO"}
                        </Badge>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString("es-VE", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Nunca"}
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
                                setSelectedUser(u);
                                setDetailSheetOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-primary" />
                              Ver Detalle Completo
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(u);
                                setRolesModalOpen(true);
                              }}
                            >
                              <Shield className="mr-2 h-3.5 w-3.5 text-primary" />
                              Gestionar Roles
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate(u.id)}
                              className={
                                u.isActive
                                  ? "text-destructive focus:text-destructive"
                                  : "text-emerald-600 focus:text-emerald-600"
                              }
                            >
                              {u.isActive ? (
                                <>
                                  <Lock className="mr-2 h-3.5 w-3.5" />
                                  Suspender Usuario
                                </>
                              ) : (
                                <>
                                  <Unlock className="mr-2 h-3.5 w-3.5" />
                                  Activar Acceso
                                </>
                              )}
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
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
