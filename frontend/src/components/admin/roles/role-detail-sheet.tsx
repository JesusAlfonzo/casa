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
import { Loader2, ShieldCheck, Users, Edit, Key } from "lucide-react";

interface RoleDetailSheetProps {
  roleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function RoleDetailSheet({
  roleId,
  open,
  onOpenChange,
  onEdit,
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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">{role?.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  {role?.description || "Sin descripción"}
                </SheetDescription>
              </div>
            </div>

            {role && (
              <Badge
                variant={role.isSystem ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {role.isSystem ? "SISTEMA" : "PERSONALIZADO"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !role ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontró el rol especificado.
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-xs">
            {/* Quick stats & Edit button */}
            <div className="flex items-center justify-between gap-3">
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

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit?.();
                }}
                className="h-8 text-xs"
              >
                <Edit className="h-3.5 w-3.5 mr-1 text-primary" /> Editar Rol
              </Button>
            </div>

            {/* Permisos agrupados por módulo */}
            <div className="space-y-4">
              <span className="font-semibold text-foreground text-xs block border-b border-border pb-1.5">
                Permisos Habilitados ({role.permissions?.length || 0})
              </span>

              {Object.keys(permissionsByModule).length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  Este rol no cuenta con ningún permiso asignado.
                </p>
              ) : (
                Object.entries(permissionsByModule).map(([mod, items]) => (
                  <div key={mod} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary text-[11px]">
                        {mod}
                      </span>
                      <Badge variant="outline" className="text-[9px]">
                        {items.length}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.permission.id}
                          className="flex items-center justify-between text-[11px] py-1 border-b border-border/40 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-foreground">
                              {item.permission.name}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground block">
                              {item.permission.code}
                            </span>
                          </div>
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
