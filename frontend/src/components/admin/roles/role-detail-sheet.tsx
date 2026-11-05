"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RoleDetail } from "@/types/rbac";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Users, Edit, Key, Trash2 } from "lucide-react";

interface RoleDetailSheetProps {
  roleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoleDetailSheet({
  roleId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: RoleDetailSheetProps) {
  const { data, isLoading } = useQuery<{ success: boolean; data: RoleDetail }>({
    queryKey: ["role-detail", roleId],
    queryFn: () => api.get(`/roles/${roleId}`),
    enabled: !!roleId && open,
  });

  const role = data?.data;

  // Group role permissions by module
  const permissionsByModule = React.useMemo(() => {
    if (!role?.permissions) return {};
    const map: Record<string, typeof role.permissions> = {};
    for (const item of role.permissions) {
      const mod = item.permission.module || "GENERAL";
      if (!map[mod]) map[mod] = [];
      map[mod].push(item);
    }
    return map;
  }, [role]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="text-left px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">{role?.name || "Detalle de Rol"}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {role?.description || "Sin descripción asignada"}
                </SheetDescription>
              </div>
            </div>

            {role && (
              <Badge
                variant={role.isSystem ? "secondary" : "outline"}
                className="text-[10px] shrink-0 font-mono"
              >
                {role.isSystem ? "SISTEMA" : "PERSONALIZADO"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !role ? (
          <div className="py-12 text-center text-sm text-muted-foreground p-6">
            No se encontró el rol especificado.
          </div>
        ) : (
          <div className="p-6 space-y-6 text-xs">
            {/* Quick stats & action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    <strong className="text-foreground">{role._count?.users || 0}</strong>{" "}
                    usuario(s)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-emerald-500" />
                  <span>
                    <strong className="text-foreground">
                      {role.permissions?.length || 0}
                    </strong>{" "}
                    permisos
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.()}
                  className="h-8 text-xs"
                >
                  <Edit className="h-3.5 w-3.5 mr-1 text-primary" /> Editar Rol
                </Button>

                {role.name !== "ADMIN" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete?.()}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Permisos agrupados por módulo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-foreground text-xs">
                  Permisos Habilitados ({role.permissions?.length || 0})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {Object.keys(permissionsByModule).length} módulos activos
                </span>
              </div>

              {Object.keys(permissionsByModule).length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground italic text-xs">
                  Este rol no cuenta con ningún permiso asignado actualmente.
                </div>
              ) : (
                Object.entries(permissionsByModule).map(([mod, items]) => (
                  <div key={mod} className="rounded-lg border border-border p-3.5 bg-card/60 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <span className="font-semibold text-primary text-[11px] uppercase tracking-wider">
                        {mod}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {items.length} {items.length === 1 ? "permiso" : "permisos"}
                      </Badge>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {items.map((item) => (
                        <div
                          key={item.permission.id}
                          className="flex flex-col justify-center rounded-md border border-border/40 bg-muted/20 p-2 text-[11px]"
                        >
                          <span className="font-medium text-foreground">
                            {item.permission.name}
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground mt-0.5">
                            {item.permission.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
