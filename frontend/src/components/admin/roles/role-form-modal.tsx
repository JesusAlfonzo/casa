"use client";

import React, { useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldCheck, Loader2, CheckSquare, Square } from "lucide-react";

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
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
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
  }

  // Fetch permissions grouped by module
  const { data: moduleGroupsData, isLoading: loadingPermissions } = useQuery<{
    success: boolean;
    data: ModulePermissionsGroup[];
  }>({
    queryKey: ["permissions-by-module"],
    queryFn: () => api.get("/permissions/by-module"),
    enabled: open,
  });

  const moduleGroups = moduleGroupsData?.data || [];

  // Mutation to create or update role
  const roleMutation = useMutation({
    mutationFn: (body: CreateRoleDTO | UpdateRoleDTO) => {
      if (isEditing && roleToEdit) {
        return api.put(`/roles/${roleToEdit.id}`, body);
      }
      return api.post("/roles", body);
    },
    onSuccess: () => {
      toast.success(
        isEditing ? "Rol actualizado exitosamente" : "Rol creado exitosamente"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al procesar el rol");
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
      // Unselect all in module
      setSelectedPermissionIds((prev) =>
        prev.filter((id) => !groupPermIds.includes(id))
      );
    } else {
      // Select all in module
      setSelectedPermissionIds((prev) => [
        ...prev,
        ...groupPermIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }

    roleMutation.mutate({
      name: name.trim().toUpperCase(),
      description: description.trim() || undefined,
      isActive,
      permissionIds: selectedPermissionIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? `Editar Rol: ${roleToEdit.name}` : "Crear Nuevo Rol"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure el identificador, descripción y matriz de permisos por módulo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nombre y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Identificador del Rol *</Label>
              <Input
                placeholder="SUPERVISOR, CONTADOR, etc."
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                disabled={roleToEdit?.isSystem}
                required
              />
              {roleToEdit?.isSystem && (
                <span className="text-[10px] text-muted-foreground block">
                  Los roles del sistema no pueden ser renombrados.
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Input
                placeholder="Acceso a tesorería y reportes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Permisos por Módulo */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Matriz de Permisos
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {selectedPermissionIds.length} permiso(s) asignados al rol.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    const allIds = moduleGroups.flatMap((g) =>
                      g.permissions.map((p) => p.id)
                    );
                    setSelectedPermissionIds(allIds);
                  }}
                >
                  Marcar Todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setSelectedPermissionIds([])}
                >
                  Desmarcar
                </Button>
              </div>
            </div>

            {loadingPermissions ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando catálogo de permisos...
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {moduleGroups.map((group) => {
                  const groupPermIds = group.permissions.map((p) => p.id);
                  const isAllSelected = groupPermIds.every((id) =>
                    selectedPermissionIds.includes(id)
                  );

                  return (
                    <div
                      key={group.module}
                      className="rounded-lg border border-border bg-card p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {group.module}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            Módulo {group.module}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleModuleAll(group)}
                          className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {isAllSelected ? (
                            <>
                              <CheckSquare className="h-3 w-3 mr-1 text-primary" /> Todo
                            </>
                          ) : (
                            <>
                              <Square className="h-3 w-3 mr-1" /> Marcar Todo
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer text-xs transition-colors ${
                                isChecked
                                  ? "border-primary/50 bg-primary/5 text-primary"
                                  : "border-border/60 hover:bg-muted/40 text-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-0.5 rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <div className="flex-1 overflow-hidden">
                                <div className="font-medium text-[11px]">
                                  {perm.name}
                                </div>
                                <div className="font-mono text-[9px] text-muted-foreground truncate">
                                  {perm.code}
                                </div>
                                {perm.description && (
                                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={roleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={roleMutation.isPending}>
              {roleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Guardar Rol" : "Crear Rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
