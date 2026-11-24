"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RoleDetail, type CreateUserDTO } from "@/types/rbac";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react";

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormModal({ open, onOpenChange }: UserFormModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const { data: rolesData } = useQuery<{
    success: boolean;
    data: RoleDetail[];
  }>({
    queryKey: ["admin-roles-list"],
    queryFn: () => api.get("/roles?isActive=true"),
    enabled: open,
  });

  const roles = rolesData?.data || [];

  const createUserMutation = useMutation({
    mutationFn: (body: CreateUserDTO) => api.post("/users", body),
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al crear el usuario");
    },
  });

  const resetForm = () => {
    setName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setPhone("");
    setPassword("");
    setShowPassword(false);
    setSelectedRoleIds([]);
  };

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Escribe el nombre del usuario");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Escribe un correo electrónico válido");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    createUserMutation.mutate({
      name: name.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase() || undefined,
      phone: phone.trim() || undefined,
      password,
      roleIds: selectedRoleIds,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[88dvh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Encabezado */}
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Nuevo usuario
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Crea el acceso para una persona y elige qué rol tendrá.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-name" className="text-sm font-medium">
                  Nombre *
                </Label>
                <Input
                  id="user-name"
                  placeholder="Ej. Carlos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-lastname" className="text-sm font-medium">
                  Apellido
                </Label>
                <Input
                  id="user-lastname"
                  placeholder="Ej. González"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Correo y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-email" className="text-sm font-medium">
                  Correo electrónico *
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="carlos@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-phone" className="text-sm font-medium">
                  Teléfono
                </Label>
                <Input
                  id="user-phone"
                  placeholder="Ej. 0412-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Usuario y Contraseña */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-username" className="text-sm font-medium">
                  Usuario (opcional)
                </Label>
                <Input
                  id="user-username"
                  placeholder="Ej. carlos"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-password" className="text-sm font-medium">
                  Contraseña inicial *
                </Label>
                <div className="relative">
                  <Input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Ver contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de Roles */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Roles del usuario
                </h3>
                <p className="text-sm text-muted-foreground">
                  Activa uno o más roles para definir qué podrá hacer en el
                  sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((role) => {
                  const isSelected = selectedRoleIds.includes(role.id);
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleToggleRole(role.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-4 cursor-pointer transition-colors select-none",
                        isSelected
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
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {role.description}
                          </p>
                        )}
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRole(role.id)}
                          aria-label={role.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pie fijo */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isPending}
              className="h-10 px-5 text-sm font-medium"
            >
              {createUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear usuario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
