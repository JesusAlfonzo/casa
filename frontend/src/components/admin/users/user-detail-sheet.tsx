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

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      api.patch<{ message?: string }>(`/users/${userId}/status`),
    onSuccess: (res) => {
      toast.success(res?.message || "Estado del usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as Error).message || "Error al modificar el estado del usuario"
      );
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="text-left px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-base shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-lg font-semibold">
                    {user?.name} {user?.lastName || ""}
                  </SheetTitle>
                  {user && (
                    <Badge
                      variant={user.isActive ? "secondary" : "destructive"}
                      className="text-xs font-normal"
                    >
                      {user.isActive ? "Activo" : "Suspendido"}
                    </Badge>
                  )}
                </div>
                <SheetDescription className="text-sm mt-0.5">
                  @{user?.username || "sin_usuario"}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="py-12 text-center text-sm text-muted-foreground p-6">
            No se encontró información del usuario.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Button
                variant={user.isActive ? "destructive" : "default"}
                className="flex-1 h-10 text-sm gap-2"
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.isActive ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                <span>
                  {user.isActive ? "Suspender acceso" : "Activar acceso"}
                </span>
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-10 text-sm gap-2"
                onClick={() => onEditRoles?.()}
              >
                <Shield className="h-4 w-4" />
                <span>Cambiar roles</span>
              </Button>
            </div>

            {/* Datos de la cuenta */}
            <div className="rounded-xl border border-border p-5 space-y-3.5 bg-card">
              <h3 className="text-base font-semibold text-foreground">
                Datos de la cuenta
              </h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> Correo
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {user.email}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> Teléfono
                  </span>
                  <span className="font-medium text-foreground">
                    {user.phone || "No especificado"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" /> Último acceso
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

                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" /> Miembro desde
                  </span>
                  <span className="font-medium text-foreground">
                    {new Date(user.createdAt).toLocaleDateString("es-VE")}
                  </span>
                </div>
              </div>
            </div>

            {/* Actividad */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                Actividad registrada
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span>Ventas</span>
                  </div>
                  <span className="text-2xl font-bold mt-1.5 block text-foreground">
                    {user._count?.sales || 0}
                  </span>
                </div>

                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-emerald-500" />
                    <span>Compras</span>
                  </div>
                  <span className="text-2xl font-bold mt-1.5 block text-foreground">
                    {user._count?.purchases || 0}
                  </span>
                </div>

                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span>Pagos</span>
                  </div>
                  <span className="text-2xl font-bold mt-1.5 block text-foreground">
                    {user._count?.paymentTransactions || 0}
                  </span>
                </div>

                <div className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PackageCheck className="h-4 w-4 text-purple-500" />
                    <span>Mov. inventario</span>
                  </div>
                  <span className="text-2xl font-bold mt-1.5 block text-foreground">
                    {user._count?.inventoryMovements || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Roles asignados */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                Roles asignados ({(user.roles || []).length})
              </h3>

              {!user.roles || user.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Este usuario no tiene ningún rol asignado actualmente.
                </p>
              ) : (
                <div className="space-y-3">
                  {user.roles.map((userRole, idx) => (
                    <div
                      key={userRole.role?.id || `role-${idx}`}
                      className="rounded-xl border border-border p-4 bg-card space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {userRole.role?.name || "Rol"}
                        </span>
                        {userRole.role?.isSystem && (
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            Por defecto
                          </Badge>
                        )}
                      </div>

                      {userRole.role?.description && (
                        <p className="text-sm text-muted-foreground">
                          {userRole.role.description}
                        </p>
                      )}

                      {userRole.role?.permissions &&
                        userRole.role.permissions.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {userRole.role.permissions.map((p) => (
                              <Badge
                                key={p.permission?.id || p.permission?.code}
                                variant="secondary"
                                className="text-xs font-normal px-2.5 py-0.5"
                              >
                                {p.permission?.name || p.permission?.code}
                              </Badge>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permisos directos si existen */}
            {user.directPermissions && user.directPermissions.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="text-base font-semibold text-foreground">
                  Permisos especiales ({user.directPermissions.length})
                </h3>
                <div className="space-y-2">
                  {user.directPermissions.map((dp) => (
                    <div
                      key={dp.permission?.id || dp.permission?.code}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {dp.permission?.name || dp.permission?.code}
                      </span>
                      <Badge
                        variant={dp.isGranted ? "secondary" : "destructive"}
                        className="text-xs font-normal"
                      >
                        {dp.isGranted ? "Permitido" : "Bloqueado"}
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
