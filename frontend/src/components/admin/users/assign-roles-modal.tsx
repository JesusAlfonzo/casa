"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RoleDetail, type UserSummaryItem } from "@/types/rbac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

interface AssignRolesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummaryItem | null;
}

export function AssignRolesModal({
  open,
  onOpenChange,
  user,
}: AssignRolesModalProps) {
  const queryClient = useQueryClient();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (user && open) {
      setSelectedRoleIds(user.roles?.map((r) => r.id) || []);
    }
  }, [user, open]);

  // Fetch available roles
  const { data: rolesData, isLoading: loadingRoles } = useQuery<{
    success: boolean;
    data: RoleDetail[];
  }>({
    queryKey: ["admin-roles-list"],
    queryFn: () => api.get("/roles?isActive=true"),
    enabled: open,
  });

  const roles = rolesData?.data || [];

  const assignRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) =>
      api.post(`/users/${user?.id}/roles`, { roleIds }),
    onSuccess: () => {
      toast.success("Roles actualizados exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail", user?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al actualizar los roles");
    },
  });

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    assignRolesMutation.mutate(selectedRoleIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Asignar Roles</DialogTitle>
              <DialogDescription className="text-xs">
                Modifique los roles asignados a{" "}
                <span className="font-semibold text-foreground">
                  {user?.name} {user?.lastName || ""}
                </span>
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Seleccione los roles aplicables:
            </Label>

            {loadingRoles ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando catálogo de roles...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-xs transition-colors select-none ${
                        isChecked
                          ? "border-primary bg-primary/5 text-primary shadow-2xs"
                          : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRole(role.id)}
                        className="mt-0.5 rounded border-muted-foreground/30 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        <div className="font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {role.name}
                            {role.isSystem && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                SISTEMA
                              </span>
                            )}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assignRolesMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={assignRolesMutation.isPending}>
              {assignRolesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
