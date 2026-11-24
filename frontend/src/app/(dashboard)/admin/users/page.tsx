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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  Loader2,
} from "lucide-react";

export default function UsersAdminPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 24;

  // Modales y paneles
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummaryItem | null>(null);

  // Cargar usuarios
  const {
    data: usersData,
    isLoading: loadingUsers,
    refetch,
  } = useQuery<PaginatedUsersResponse>({
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

  // Cargar roles para filtro
  const { data: rolesData } = useQuery<{
    success: boolean;
    data: RoleDetail[];
  }>({
    queryKey: ["admin-roles-list"],
    queryFn: () => api.get("/roles?isActive=true"),
  });

  const users = usersData?.items || [];
  const total = usersData?.total || 0;
  const totalPages = usersData?.totalPages || 1;
  const roles = rolesData?.data || [];

  // Cambiar estado activo/suspendido
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<{ message?: string }>(`/users/${id}/status`),
    onSuccess: (res) => {
      toast.success(res?.message || "Estado del usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({
        queryKey: ["user-detail", selectedUser?.id],
      });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as Error).message || "Error al actualizar el estado del usuario"
      );
    },
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  const statusLabel =
    statusFilter === "ACTIVE"
      ? "Activos"
      : statusFilter === "INACTIVE"
        ? "Suspendidos"
        : "Todos los estados";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Usuarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra quién tiene acceso al sistema y qué rol cumple.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-10 px-4 text-sm gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualizar</span>
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nuevo usuario</span>
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de usuarios
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activos
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Con acceso habilitado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suspendidos
            </CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {inactiveCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sin acceso temporalmente
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roles disponibles
            </CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {roles.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Roles activos para asignar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido, usuario o correo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-9 h-10 text-sm bg-card"
          />
          {search !== debouncedSearch && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val || "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 h-10 text-sm bg-card">
              <SelectValue>
                {roleFilter === "ALL" ? "Todos los roles" : roleFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val || "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 h-10 text-sm bg-card">
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="ACTIVE">Activos</SelectItem>
              <SelectItem value="INACTIVE">Suspendidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cuadrícula de Tarjetas de Usuarios */}
      {loadingUsers ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No se encontraron usuarios con los filtros aplicados.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const fullName = `${u.name} ${u.lastName || ""}`.trim();
            const initials = u.name ? u.name.charAt(0).toUpperCase() : "U";

            return (
              <Card
                key={u.id}
                className="border-border shadow-2xs flex flex-col justify-between hover:border-foreground/20 transition-colors"
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg font-semibold text-foreground truncate">
                          {fullName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          @{u.username || "sin_usuario"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={u.isActive ? "secondary" : "destructive"}
                      className="text-xs font-normal shrink-0"
                    >
                      {u.isActive ? "Activo" : "Suspendido"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-5">
                  {/* Contacto y último acceso */}
                  <div className="space-y-2 pt-4 border-t border-border/60 text-sm">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {u.phone || "Sin teléfono"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Último acceso:{" "}
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString("es-VE")
                          : "Nunca"}
                      </span>
                    </div>
                  </div>

                  {/* Roles asignados */}
                  <div className="space-y-2 pt-3 border-t border-border/60">
                    <span className="text-xs font-medium text-muted-foreground block">
                      Roles asignados
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {!u.roles || u.roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">
                          Sin rol asignado
                        </span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="outline"
                            className="text-xs font-medium px-2.5 py-0.5"
                          >
                            {r.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm gap-1.5"
                      onClick={() => {
                        setSelectedUser(u);
                        setDetailSheetOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm gap-1.5"
                      onClick={() => {
                        setSelectedUser(u);
                        setRolesModalOpen(true);
                      }}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Roles</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 shrink-0 transition-colors ${
                        u.isActive
                          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      }`}
                      onClick={() => toggleStatusMutation.mutate(u.id)}
                      disabled={toggleStatusMutation.isPending}
                      title={
                        u.isActive ? "Suspender acceso" : "Reactivar acceso"
                      }
                    >
                      {u.isActive ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación solo si hay más de 1 página */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-5">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} usuarios)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="h-10 px-4 text-sm gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="h-10 px-4 text-sm gap-1.5"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modales y Panel Lateral */}
      <UserFormModal open={createModalOpen} onOpenChange={setCreateModalOpen} />

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
