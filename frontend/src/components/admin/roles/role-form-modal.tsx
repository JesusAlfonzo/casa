"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type RoleDetail,
  type ModulePermissionsGroup,
  type CreateRoleDTO,
  type UpdateRoleDTO,
} from "@/types/rbac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ShieldCheck, Loader2, CheckCheck, XCircle } from "lucide-react";
import { getModuleLabel } from "./module-labels";

interface RoleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleToEdit?: RoleDetail | null;
}

export function RoleFormModal({
  open,
  onOpenChange,
  roleToEdit,
}: RoleFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!roleToEdit;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    []
  );
  const [activeModule, setActiveModule] = useState<string>("");
  const [prevRoleKey, setPrevRoleKey] = useState<string | null>(null);

  const currentRoleKey = roleToEdit ? `${roleToEdit.id}-${open}` : `new-${open}`;
  if (currentRoleKey !== prevRoleKey) {
    setPrevRoleKey(currentRoleKey);
    if (roleToEdit && open) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description || "");
      setIsActive(roleToEdit.isActive);
      const permIds = roleToEdit.permissions?.map((p) => p.permission.id) || [];
      setSelectedPermissionIds(permIds);
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setSelectedPermissionIds([]);
    }
    setActiveModule("");
  }

  // Cargar catálogo de permisos por módulo
  const { data: moduleGroupsData, isLoading: loadingPermissions } = useQuery<{
    success: boolean;
    data: ModulePermissionsGroup[];
  }>({
    queryKey: ["permissions-by-module"],
    queryFn: () => api.get("/permissions/by-module"),
    enabled: open,
  });

  const moduleGroups = useMemo(
    () => moduleGroupsData?.data || [],
    [moduleGroupsData]
  );

  const totalPermissionsCount = useMemo(
    () => moduleGroups.reduce((acc, g) => acc + g.permissions.length, 0),
    [moduleGroups]
  );

  const effectiveActiveModule =
    activeModule && moduleGroups.some((g) => g.module === activeModule)
      ? activeModule
      : moduleGroups[0]?.module || "";

  const currentGroup = useMemo(
    () => moduleGroups.find((g) => g.module === effectiveActiveModule) || null,
    [moduleGroups, effectiveActiveModule]
  );

  // Guardar rol (crear o editar)
  const roleMutation = useMutation({
    mutationFn: (body: CreateRoleDTO | UpdateRoleDTO) => {
      if (isEditing && roleToEdit) {
        return api.put(`/roles/${roleToEdit.id}`, body);
      }
      return api.post("/roles", body);
    },
    onSuccess: () => {
      toast.success(
        isEditing ? "Rol actualizado correctamente" : "Rol creado correctamente"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
      if (roleToEdit?.id) {
        queryClient.invalidateQueries({
          queryKey: ["role-detail", roleToEdit.id],
        });
      }
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al guardar el rol");
    },
  });

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleModuleAll = (moduleGroup: ModulePermissionsGroup) => {
    const groupPermIds = moduleGroup.permissions.map((p) => p.id);
    const allSelected = groupPermIds.every((id) =>
      selectedPermissionIds.includes(id)
    );

    if (allSelected) {
      setSelectedPermissionIds((prev) =>
        prev.filter((id) => !groupPermIds.includes(id))
      );
    } else {
      setSelectedPermissionIds((prev) => [
        ...prev,
        ...groupPermIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSelectAll = () => {
    const allIds = moduleGroups.flatMap((g) => g.permissions.map((p) => p.id));
    setSelectedPermissionIds(allIds);
  };

  const handleClearAll = () => {
    setSelectedPermissionIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Escribe un nombre para el rol");
      return;
    }

    roleMutation.mutate({
      name: name.trim().toUpperCase(),
      description: description.trim() || undefined,
      isActive,
      permissionIds: selectedPermissionIds,
    });
  };

  const currentGroupAllSelected = currentGroup
    ? currentGroup.permissions.every((p) =>
        selectedPermissionIds.includes(p.id)
      )
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[88dvh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Encabezado fijo */}
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {isEditing ? `Editar rol: ${roleToEdit.name}` : "Nuevo rol"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Elige el nombre del rol y activa los permisos que podrá usar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          {/* Datos básicos del rol */}
          <div className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name" className="text-sm font-medium">
                  Nombre del rol *
                </Label>
                <Input
                  id="role-name"
                  placeholder="Ej. VENDEDOR, AYUDANTE"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  disabled={roleToEdit?.isSystem}
                  required
                  className="h-10 text-sm"
                />
                {roleToEdit?.isSystem && (
                  <p className="text-xs text-muted-foreground">
                    Los roles por defecto no se pueden renombrar.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="role-description"
                  className="text-sm font-medium"
                >
                  Descripción
                </Label>
                <Input
                  id="role-description"
                  placeholder="Ej. Puede registrar ventas y ver inventario"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Selector de permisos en 2 paneles */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {loadingPermissions ? (
              <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2.5" />
                Cargando permisos...
              </div>
            ) : (
              <>
                {/* Panel izquierdo: Lista de módulos */}
                <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/15 flex flex-col min-h-0">
                  <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Módulos
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Activar todos los permisos"
                      >
                        Todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Desactivar todos los permisos"
                      >
                        Ninguno
                      </Button>
                    </div>
                  </div>

                  <nav
                    aria-label="Módulos de permisos"
                    className="flex md:flex-col gap-1 p-2.5 overflow-x-auto md:overflow-y-auto"
                  >
                    {moduleGroups.map((group) => {
                      const activeCount = group.permissions.filter((p) =>
                        selectedPermissionIds.includes(p.id)
                      ).length;
                      const totalCount = group.permissions.length;
                      const isSelected = group.module === effectiveActiveModule;

                      return (
                        <button
                          key={group.module}
                          type="button"
                          onClick={() => setActiveModule(group.module)}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors shrink-0 md:w-full",
                            isSelected
                              ? "bg-background text-foreground font-medium shadow-xs ring-1 ring-border"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <span className="truncate">
                            {getModuleLabel(group.module)}
                          </span>
                          <span
                            className={cn(
                              "text-xs tabular-nums rounded-full px-2 py-0.5 shrink-0",
                              activeCount > 0
                                ? "bg-primary/10 text-primary font-medium"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {activeCount}/{totalCount}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </aside>

                {/* Panel derecho: Permisos del módulo activo */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {currentGroup ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">
                            {getModuleLabel(currentGroup.module)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Activa o desactiva lo que este rol puede hacer aquí.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleModuleAll(currentGroup)}
                          className="h-9 px-3 text-sm gap-2 shrink-0 self-start sm:self-auto"
                        >
                          {currentGroupAllSelected ? (
                            <>
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                              <span>Desactivar todos</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="h-4 w-4 text-primary" />
                              <span>Activar todos</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {currentGroup.permissions.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(
                            perm.id
                          );
                          return (
                            <div
                              key={perm.id}
                              onClick={() => handleTogglePermission(perm.id)}
                              className={cn(
                                "flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors select-none",
                                isChecked
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border bg-card hover:bg-muted/40"
                              )}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-sm font-medium text-foreground">
                                  {perm.name}
                                </div>
                                {perm.description && (
                                  <p className="text-sm text-muted-foreground leading-snug">
                                    {perm.description}
                                  </p>
                                )}
                              </div>

                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0"
                              >
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handleTogglePermission(perm.id)
                                  }
                                  aria-label={perm.name}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No hay permisos disponibles para mostrar.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pie fijo */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              <strong className="text-foreground">
                {selectedPermissionIds.length}
              </strong>{" "}
              de {totalPermissionsCount} permisos activos
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={roleMutation.isPending}
                className="h-10 px-4 text-sm"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={roleMutation.isPending}
                className="h-10 px-5 text-sm font-medium"
              >
                {roleMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Guardar cambios" : "Crear rol"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
