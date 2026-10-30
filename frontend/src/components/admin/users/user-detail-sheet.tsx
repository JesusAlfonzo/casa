"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type UserDetail } from "@/types/rbac";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Truck,
  DollarSign,
  PackageCheck,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRoles?: () => void;
}

export function UserDetailSheet({
  userId,
  open,
  onOpenChange,
  onEditRoles,
}: UserDetailSheetProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ success: boolean; data: UserDetail }>({
    queryKey: ["user-detail", userId],
    queryFn: () => api.get(`/users/${userId}`),
    enabled: !!userId && open,
  });

  const user = data?.data;

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () => api.patch<{ message?: string }>(`/users/${userId}/status`),
    onSuccess: (res) => {
      toast.success(res?.message || "Estado de usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al modificar estado del usuario");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <SheetTitle className="text-base font-bold">
                  {user?.name} {user?.lastName || ""}
                </SheetTitle>
                <SheetDescription className="text-xs font-mono">
                  @{user?.username || "sin_usuario"}
                </SheetDescription>
              </div>
            </div>

            {user && (
              <Badge
                variant={user.isActive ? "default" : "destructive"}
                className="text-[10px]"
              >
                {user.isActive ? "ACTIVO" : "SUSPENDIDO"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontró información del usuario.
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-xs">
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant={user.isActive ? "destructive" : "default"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : user.isActive ? (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Unlock className="mr-1.5 h-3.5 w-3.5" />
                )}
                {user.isActive ? "Suspender Acceso" : "Activar Acceso"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  onEditRoles?.();
                }}
              >
                <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Gestionar Roles
              </Button>
            </div>

            {/* Datos de contacto y cuenta */}
            <div className="rounded-lg border border-border p-3 space-y-2.5">
              <span className="font-semibold text-foreground text-xs block">
                Datos de la Cuenta
              </span>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Correo:
                </span>
                <span className="font-medium text-foreground">{user.email}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Teléfono:
                </span>
                <span className="font-medium text-foreground">
                  {user.phone || "No especificado"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Último Acceso:
                </span>
                <span className="font-medium text-foreground">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString("es-VE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "Nunca"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Miembro desde:
                </span>
                <span className="font-medium text-foreground">
                  {new Date(user.createdAt).toLocaleDateString("es-VE")}
                </span>
              </div>
            </div>

            {/* Actividad Operativa */}
            <div className="space-y-2">
              <span className="font-semibold text-foreground text-xs block">
                Actividad Registrada
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Ventas Emitidas
                  </div>
                  <span className="text-base font-bold mt-1 block text-foreground">
                    {user._count?.sales || 0}
                  </span>
                </div>

                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Truck className="h-3.5 w-3.5 text-emerald-500" /> Compras Creadas
                  </div>
                  <span className="text-base font-bold mt-1 block text-foreground">
                    {user._count?.purchases || 0}
                  </span>
                </div>

                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <DollarSign className="h-3.5 w-3.5 text-blue-500" /> Pagos Procesados
                  </div>
                  <span className="text-base font-bold mt-1 block text-foreground">
                    {user._count?.paymentTransactions || 0}
                  </span>
                </div>

                <div className="rounded-lg border border-border p-2.5 bg-muted/20">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <PackageCheck className="h-3.5 w-3.5 text-purple-500" /> Mov. Kardex
                  </div>
                  <span className="text-base font-bold mt-1 block text-foreground">
                    {user._count?.inventoryMovements || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Roles Asignados y Permisos Efectivos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">
                  Roles Asignados ({user.roles.length})
                </span>
              </div>

              {user.roles.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  Este usuario no tiene ningún rol asignado actualmente.
                </p>
              ) : (
                <div className="space-y-2">
                  {user.roles.map((userRole) => (
                    <div
                      key={userRole.role.id}
                      className="rounded-lg border border-border p-2.5 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">
                          {userRole.role.name}
                        </span>
                        {userRole.role.isSystem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            SISTEMA
                          </span>
                        )}
                      </div>
                      {userRole.role.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {userRole.role.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1">
                        {userRole.role.permissions?.map((p) => (
                          <Badge
                            key={p.permission.id}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 font-mono"
                          >
                            {p.permission.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permisos Directos / Excepciones si existen */}
            {user.directPermissions && user.directPermissions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="font-semibold text-foreground text-xs">
                  Permisos Directos / Excepciones ({user.directPermissions.length})
                </span>
                <div className="space-y-1">
                  {user.directPermissions.map((dp) => (
                    <div
                      key={dp.permission.id}
                      className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-[11px]"
                    >
                      <span className="font-mono">{dp.permission.code}</span>
                      <Badge
                        variant={dp.isGranted ? "default" : "destructive"}
                        className="text-[9px]"
                      >
                        {dp.isGranted ? "CONCEDIDO" : "REVOCADO"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
