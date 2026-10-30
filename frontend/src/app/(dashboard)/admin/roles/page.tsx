"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type RoleDetail,
  type ModulePermissionsGroup,
} from "@/types/rbac";
import { RoleFormModal } from "@/components/admin/roles/role-form-modal";
import { RoleDetailSheet } from "@/components/admin/roles/role-detail-sheet";
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<RoleDetail | null>(null);

  // Delete role dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDetail | null>(null);

  // Fetch roles
  const { data: rolesData, isLoading: loadingRoles, refetch } = useQuery<{
    success: boolean;
    data: RoleDetail[];
  }>({
    queryKey: ["admin-roles", search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      return api.get(`/roles?${params.toString()}`);
    },
  });

  // Fetch permissions catalogue
  const { data: moduleGroupsData, isLoading: loadingCatalogue } = useQuery<{
    success: boolean;
    data: ModulePermissionsGroup[];
  }>({
    queryKey: ["permissions-by-module"],
    queryFn: () => api.get("/permissions/by-module"),
  });

  const roles = rolesData?.data || [];
  const moduleGroups = moduleGroupsData?.data || [];

  // Total permissions count
  const totalPermissionsCount = moduleGroups.reduce(
    (acc, g) => acc + g.permissions.length,
    0
  );

  // Metrics
  const systemRolesCount = roles.filter((r) => r.isSystem).length;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success("Rol eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Roles y Permisos (RBAC)
          </h2>
          <p className="text-sm text-muted-foreground">
            Definición de perfiles de usuario, matriz de acceso y permisos por módulo del ERP.
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
              setRoleToEdit(null);
              setCreateModalOpen(true);
            }}
            className="h-9 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo Rol
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Roles
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {roles.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Configurados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Roles del Sistema
            </CardTitle>
            <Lock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {systemRolesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Predeterminados protegidos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Roles Personalizados
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {customRolesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Creados por la empresa
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Catálogo de Permisos
            </CardTitle>
            <Key className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalPermissionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              En {moduleGroups.length} módulos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Roles List & Permissions Explorer */}
      <Tabs defaultValue="roles" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-muted">
            <TabsTrigger value="roles" className="text-xs">
              Listado de Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">
              Catálogo de Permisos ({totalPermissionsCount})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar rol o permiso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Tab: Roles Cards */}
        <TabsContent value="roles" className="space-y-4">
          {loadingRoles ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
              No se encontraron roles con el criterio de búsqueda.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => {
                const userCount = role._count?.users || 0;
                const permCount = role.permissions?.length || 0;

                return (
                  <Card
                    key={role.id}
                    className="border-border shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-bold text-foreground">
                            {role.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {role.description || "Sin descripción asignada"}
                          </p>
                        </div>

                        <Badge
                          variant={role.isSystem ? "secondary" : "outline"}
                          className="text-[10px] shrink-0 font-mono"
                        >
                          {role.isSystem ? "SISTEMA" : "PERSONALIZADO"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2 text-xs">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <div className="overflow-hidden">
                            <span className="font-bold text-foreground block">
                              {userCount}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Usuarios
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2 text-xs">
                          <Key className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div className="overflow-hidden">
                            <span className="font-bold text-foreground block">
                              {permCount}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              Permisos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => {
                            setSelectedRole(role);
                            setDetailSheetOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-primary" /> Ver
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => {
                            setRoleToEdit(role);
                            setCreateModalOpen(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>

                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setRoleToDelete(role);
                              setDeleteDialogOpen(true);
                            }}
                            title="Eliminar rol"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Tab: Full Permissions Catalogue */}
        <TabsContent value="permissions" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Catálogo Global de Permisos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lista completa de capacidades del sistema que pueden ser asignadas a roles o usuarios.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingCatalogue ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                moduleGroups.map((group) => (
                  <div key={group.module} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-1.5">
                      <Badge variant="outline" className="font-mono text-xs">
                        {group.module}
                      </Badge>
                      <span className="font-semibold text-xs text-foreground">
                        Permisos de {group.module} ({group.permissions.length})
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.permissions.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-border p-3 bg-muted/10 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">
                              {p.name}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-primary block">
                            {p.code}
                          </span>
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground">
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

      {/* Role Form Modal (Create or Edit) */}
      <RoleFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        roleToEdit={roleToEdit}
      />

      {/* Role Detail Sheet */}
      <RoleDetailSheet
        roleId={selectedRole?.id || null}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={() => {
          setDetailSheetOpen(false);
          setRoleToEdit(selectedRole);
          setCreateModalOpen(true);
        }}
      />

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base">Eliminar Rol</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              ¿Está seguro de que desea eliminar permanentemente el rol{" "}
              <strong className="text-foreground">{roleToDelete?.name}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {roleToDelete && (roleToDelete._count?.users || 0) > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <strong>Atención:</strong> Este rol tiene {roleToDelete._count?.users} usuario(s) asignado(s).
              Debe reasignar a esos usuarios antes de poder eliminar el rol.
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteRoleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={
                deleteRoleMutation.isPending ||
                ((roleToDelete?._count?.users || 0) > 0)
              }
            >
              {deleteRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
