"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RoleDetail, type UserSummaryItem } from "@/types/rbac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [prevUserKey, setPrevUserKey] = useState<string | null>(null);

  const currentUserKey = user ? `${user.id}-${open}` : `none-${open}`;
  if (currentUserKey !== prevUserKey) {
    setPrevUserKey(currentUserKey);
    if (user && open) {
      setSelectedRoleIds(user.roles?.map((r) => r.id) || []);
    } else {
      setSelectedRoleIds([]);
    }
  }

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
      toast.success("Roles actualizados correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail", user?.id] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al actualizar los roles");
    },
  });

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    assignRolesMutation.mutate(selectedRoleIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85dvh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Cambiar roles
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Elige los roles que tendrá{" "}
                <strong className="text-foreground">
                  {user?.name} {user?.lastName || ""}
                </strong>
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {loadingRoles ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Cargando roles...
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors select-none",
                        isChecked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {role.name}
                          </span>
                          {role.isSystem && (
                            <Badge
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              Por defecto
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted-foreground leading-snug">
                            {role.description}
                          </p>
                        )}
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <Switch
                          checked={isChecked}
                          onCheckedChange={() => handleToggleRole(role.id)}
                          aria-label={role.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assignRolesMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={assignRolesMutation.isPending}
              className="h-10 px-5 text-sm font-medium"
            >
              {assignRolesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
