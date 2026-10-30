"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type RoleDetail, type CreateUserDTO } from "@/types/rbac";
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
import { toast } from "sonner";
import { UserPlus, Shield, Loader2, Eye, EyeOff } from "lucide-react";

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

  // Fetch available roles
  const { data: rolesData } = useQuery<{ success: boolean; data: RoleDetail[] }>({
    queryKey: ["admin-roles-list"],
    queryFn: () => api.get("/roles?isActive=true"),
    enabled: open,
  });

  const roles = rolesData?.data || [];

  const createUserMutation = useMutation({
    mutationFn: (body: CreateUserDTO) => api.post("/users", body),
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al registrar el usuario");
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
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre del usuario es obligatorio");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Ingrese un correo electrónico válido");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Nuevo Usuario del Sistema</DialogTitle>
              <DialogDescription className="text-xs">
                Cree un operador o empleado asignándole credenciales y roles iniciales.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input
                placeholder="Carlos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Apellido</Label>
              <Input
                placeholder="González"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Correo Electrónico *</Label>
              <Input
                type="email"
                placeholder="carlos@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input
                placeholder="+58 412 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Usuario y Contraseña */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre de Usuario (Login)</Label>
              <Input
                placeholder="cgonzalez"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contraseña Inicial *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
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

          {/* Roles Selector */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold">Roles del Usuario</Label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Seleccione los roles que definirán el acceso y los permisos de este operador.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {roles.map((role) => {
                const isSelected = selectedRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-semibold flex items-center justify-between">
                        <span>{role.name}</span>
                        {role.isSystem && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            SISTEMA
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
