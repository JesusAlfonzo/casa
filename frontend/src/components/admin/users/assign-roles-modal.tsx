"use client";

import React, { useState } from "react";
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
import { Shield, Loader2, Check } from "lucide-react";

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
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  const currentUserId = user?.id || null;
  if (currentUserId !== prevUserId) {
    setPrevUserId(currentUserId);
    setSelectedRoleIds(user?.roles.map((r) => r.id) || []);
  }

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
      <DialogContent className="max-w-md">
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
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={`flex items-start justify-between rounded-lg border p-3 cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-2">
                          <span>{role.name}</span>
                          {role.isSystem && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              SISTEMA
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>

                      <div
                        className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </div>
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
