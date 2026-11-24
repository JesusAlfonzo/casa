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
import {
  Loader2,
  ShieldCheck,
  Users,
  Edit,
  Key,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { getModuleLabel } from "./module-labels";

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

  // Agrupar permisos por módulo
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="text-left px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-lg font-semibold">
                    {role?.name || "Detalle del rol"}
                  </SheetTitle>
                  {role && (
                    <Badge
                      variant={role.isSystem ? "secondary" : "outline"}
                      className="text-xs font-normal"
                    >
                      {role.isSystem ? "Por defecto" : "Personalizado"}
                    </Badge>
                  )}
                </div>
                <SheetDescription className="text-sm mt-1">
                  {role?.description || "Sin descripción asignada"}
                </SheetDescription>
              </div>
            </div>
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
          <div className="p-6 space-y-6">
            {/* Resumen y acciones */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>
                    <strong className="text-foreground">
                      {role._count?.users || 0}
                    </strong>{" "}
                    {(role._count?.users || 0) === 1 ? "usuario" : "usuarios"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                  onClick={() => onEdit?.()}
                  className="h-10 px-4 text-sm gap-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar rol</span>
                </Button>

                {role.name !== "ADMIN" && (
                  <Button
                    variant="outline"
                    onClick={() => onDelete?.()}
                    className="h-10 px-3.5 text-sm gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Permisos agrupados por módulo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-base font-semibold text-foreground">
                  Permisos activos ({role.permissions?.length || 0})
                </h3>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(permissionsByModule).length} módulos
                </span>
              </div>

              {Object.keys(permissionsByModule).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Este rol no tiene ningún permiso asignado todavía.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(permissionsByModule).map(([mod, items]) => (
                    <div
                      key={mod}
                      className="rounded-xl border border-border p-4 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                        <span className="text-sm font-semibold text-foreground">
                          {getModuleLabel(mod)}
                        </span>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {items.length}{" "}
                          {items.length === 1 ? "permiso" : "permisos"}
                        </Badge>
                      </div>

                      <ul className="space-y-2">
                        {items.map((item) => (
                          <li
                            key={item.permission.id}
                            className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {item.permission.name}
                              </div>
                              {item.permission.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.permission.description}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
