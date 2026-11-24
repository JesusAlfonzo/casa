"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type RoleDetail,
  type ModulePermissionsGroup,
} from "@/types/rbac";
import { RoleFormModal } from "@/components/admin/roles/role-form-modal";
import { RoleDetailSheet } from "@/components/admin/roles/role-detail-sheet";
import { getModuleLabel } from "@/components/admin/roles/module-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ShieldCheck,
  Shield,
  Plus,
  Users,
  Key,
  Search,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";

export default function RolesAdminPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<RoleDetail | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDetail | null>(null);

  // Cargar roles
  const {
    data: rolesData,
    isLoading: loadingRoles,
    refetch,
  } = useQuery<{
    success: boolean;
    data: RoleDetail[];
  }>({
    queryKey: ["admin-roles", debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      return api.get(`/roles?${params.toString()}`);
    },
  });

  // Cargar catálogo de permisos
  const { data: moduleGroupsData, isLoading: loadingCatalogue } = useQuery<{
    success: boolean;
    data: ModulePermissionsGroup[];
  }>({
    queryKey: ["permissions-by-module"],
    queryFn: () => api.get("/permissions/by-module"),
  });

  const roles = useMemo(() => rolesData?.data || [], [rolesData]);
  const moduleGroups = useMemo(
    () => moduleGroupsData?.data || [],
    [moduleGroupsData]
  );

  // Filtrar catálogo de permisos
  const filteredModuleGroups = useMemo(() => {
    if (!debouncedSearch.trim()) return moduleGroups;
    const term = debouncedSearch.toLowerCase().trim();
    return moduleGroups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.code.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term)) ||
            group.module.toLowerCase().includes(term) ||
            getModuleLabel(group.module).toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [moduleGroups, debouncedSearch]);

  const totalPermissionsCount = useMemo(
    () => moduleGroups.reduce((acc, g) => acc + g.permissions.length, 0),
    [moduleGroups]
  );

  const systemRolesCount = roles.filter((r) => r.isSystem).length;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  // Eliminar rol
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success("Rol eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      setSelectedRole(null);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al eliminar el rol");
    },
  });

  const confirmDelete = () => {
    if (!roleToDelete) return;
    deleteRoleMutation.mutate(roleToDelete.id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Roles y Permisos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define qué puede ver y hacer cada persona que usa el sistema.
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
            onClick={() => {
              setRoleToEdit(null);
              setCreateModalOpen(true);
            }}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo rol</span>
          </Button>
        </div>
      </div>

      {/* Resumen limpio */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de roles
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {roles.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Activos en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por defecto
            </CardTitle>
            <Lock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {systemRolesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Roles base protegidos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Personalizados
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {customRolesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Creados por ti
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Permisos disponibles
            </CardTitle>
            <Key className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {totalPermissionsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En {moduleGroups.length} módulos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas: Listado de Roles y Catálogo de Permisos */}
      <Tabs defaultValue="roles" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-muted p-1 h-auto">
            <TabsTrigger value="roles" className="text-sm px-4 py-2">
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-sm px-4 py-2">
              Lista de permisos ({totalPermissionsCount})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar rol o permiso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-9 h-10 text-sm"
            />
            {search !== debouncedSearch && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Pestaña: Tarjetas de Roles */}
        <TabsContent value="roles" className="space-y-4">
          {loadingRoles ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No se encontraron roles con esa búsqueda.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => {
                const userCount = role._count?.users || 0;
                const permCount = role.permissions?.length || 0;
                const isProtectedAdmin = role.name === "ADMIN";

                return (
                  <Card
                    key={role.id}
                    className="border-border shadow-2xs flex flex-col justify-between hover:border-foreground/20 transition-colors"
                  >
                    <CardHeader className="p-6 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <CardTitle className="text-lg font-semibold text-foreground truncate">
                            {role.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {role.description || "Sin descripción asignada"}
                          </p>
                        </div>

                        <Badge
                          variant={role.isSystem ? "secondary" : "outline"}
                          className="text-xs font-normal shrink-0"
                        >
                          {role.isSystem ? "Por defecto" : "Personalizado"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-0 space-y-5">
                      {/* Estadísticas */}
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60">
                        <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <span className="text-base font-semibold text-foreground block leading-tight">
                              {userCount}
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              {userCount === 1 ? "Usuario" : "Usuarios"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                          <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-base font-semibold text-foreground block leading-tight">
                              {permCount}
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              Permisos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-10 text-sm gap-1.5"
                          onClick={() => {
                            setSelectedRole(role);
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
                            setRoleToEdit(role);
                            setCreateModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span>Editar</span>
                        </Button>

                        {!isProtectedAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => {
                              setRoleToDelete(role);
                              setDeleteDialogOpen(true);
                            }}
                            title="Eliminar rol"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground/40 cursor-not-allowed shrink-0"
                            disabled
                            title="El rol ADMIN no se puede eliminar"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Pestaña: Lista de Permisos */}
        <TabsContent value="permissions" className="space-y-4">
          <Card className="border-border shadow-2xs">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-semibold">
                Permisos disponibles en el sistema
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Aquí puedes consultar qué permite hacer cada permiso, ordenado
                por módulo.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-8">
              {loadingCatalogue ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredModuleGroups.length === 0 ? (
                <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
                  No se encontraron permisos que coincidan con &ldquo;
                  {debouncedSearch}&rdquo;.
                </div>
              ) : (
                filteredModuleGroups.map((group) => (
                  <div key={group.module} className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {getModuleLabel(group.module)}
                      </h3>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {group.permissions.length}{" "}
                        {group.permissions.length === 1
                          ? "permiso"
                          : "permisos"}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.permissions.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-border p-4 bg-muted/20 space-y-1"
                        >
                          <div className="text-sm font-medium text-foreground">
                            {p.name}
                          </div>
                          {p.description && (
                            <p className="text-sm text-muted-foreground leading-snug">
                              {p.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Crear / Editar Rol */}
      <RoleFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        roleToEdit={roleToEdit}
      />

      {/* Panel de Detalle del Rol */}
      <RoleDetailSheet
        roleId={selectedRole?.id || null}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={() => {
          setDetailSheetOpen(false);
          setRoleToEdit(selectedRole);
          setCreateModalOpen(true);
        }}
        onDelete={() => {
          setRoleToDelete(selectedRole);
          setDeleteDialogOpen(true);
          setDetailSheetOpen(false);
        }}
      />

      {/* Confirmación de Eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-semibold">
                Eliminar rol
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm pt-2 leading-relaxed">
              ¿Seguro que deseas eliminar el rol{" "}
              <strong className="text-foreground">{roleToDelete?.name}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {roleToDelete && (roleToDelete._count?.users || 0) > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive">
              <strong>Atención:</strong> Este rol tiene{" "}
              {roleToDelete._count?.users} usuario(s) asignado(s). Cámbialos a
              otro rol antes de poder eliminarlo.
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteRoleMutation.isPending}
              className="h-10 text-sm"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={
                deleteRoleMutation.isPending ||
                (roleToDelete?._count?.users || 0) > 0
              }
              className="h-10 text-sm"
            >
              {deleteRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
