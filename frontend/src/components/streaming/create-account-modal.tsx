"use client";

import React, { useState } from "react";
import { type Service, type Supplier } from "@/types/streaming";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Tv, Mail, Lock, KeyRound, Calendar, DollarSign, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  suppliers: Supplier[];
}

export function CreateAccountModal({
  open,
  onOpenChange,
  services,
  suppliers,
}: CreateAccountModalProps) {
  const queryClient = useQueryClient();

  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [supplierId, setSupplierId] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [profileCapacity, setProfileCapacity] = useState<number>(5);
  const [accountCost, setAccountCost] = useState<number>(0);
  const [supplierCutoffDate, setSupplierCutoffDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !supplierCutoffDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setSupplierCutoffDate(d.toISOString().split("T")[0]);
    }
  }

  // Auto-set capacity based on service
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const srv = services.find((s) => s.id === id);
    if (srv) {
      if (srv.isFullAccountSale) {
        setProfileCapacity(1);
      } else if (srv.name.toLowerCase().includes("netflix")) {
        setProfileCapacity(5);
      } else if (srv.name.toLowerCase().includes("disney") || srv.name.toLowerCase().includes("prime")) {
        setProfileCapacity(4);
      } else if (srv.name.toLowerCase().includes("spotify")) {
        setProfileCapacity(1);
      }
    }
  };

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!serviceId) throw new Error("Debes seleccionar un servicio de streaming.");
      if (!accessEmail.trim() || !accessPassword.trim()) {
        throw new Error("El correo y contraseña de acceso son obligatorios.");
      }
      if (!supplierCutoffDate) {
        throw new Error("Debes indicar la fecha de corte con el proveedor.");
      }

      const payload = {
        serviceId,
        supplierId: supplierId || undefined,
        accessEmail: accessEmail.trim(),
        accessPassword: accessPassword.trim(),
        securityPin: securityPin.trim() || undefined,
        profileCapacity: Number(profileCapacity) || 1,
        accountCost: accountCost > 0 ? accountCost : undefined,
        supplierCutoffDate: new Date(supplierCutoffDate).toISOString(),
        notes: notes.trim() || undefined,
      };

      return api.post("/streaming-accounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-summary"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-stats"] });
      onOpenChange(false);
      setAccessEmail("");
      setAccessPassword("");
      setSecurityPin("");
      setNotes("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al registrar la cuenta.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <Tv className="h-5 w-5" />
            <DialogTitle>Registrar Nueva Cuenta Maestra</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Ingresa las credenciales maestras y la fecha de expiración contratada con el proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Service & Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="srv-select">Servicio *</Label>
              <select
                id="srv-select"
                value={serviceId || services[0]?.id || ""}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-select">Proveedor (Opcional)</Label>
              <select
                id="sup-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">Sin proveedor asignado</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.legalName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">Correo de Acceso *</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-email"
                  type="email"
                  placeholder="cuenta@gmail.com"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  className="pl-8 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-password">Contraseña Maestra *</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-password"
                  placeholder="Clave1234*"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className="pl-8 h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Security PIN & Profile Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-pin">PIN Maestro / Seguridad</Label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-pin"
                  placeholder="Ej: 1234"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  className="pl-8 h-9 text-xs font-mono"
                  maxLength={8}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-capacity">Capacidad de Pantallas/Perfiles *</Label>
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-capacity"
                  type="number"
                  min={1}
                  max={20}
                  value={profileCapacity}
                  onChange={(e) => setProfileCapacity(Number(e.target.value) || 1)}
                  className="pl-8 h-9 text-xs font-semibold"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Se crearán automáticamente {profileCapacity} perfiles (Pantalla 1..{profileCapacity}).
              </p>
            </div>
          </div>

          {/* Cost & Cutoff Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-cost">Costo de Adquisición ($ USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={accountCost || ""}
                  onChange={(e) => setAccountCost(Number(e.target.value) || 0)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-cutoff">Fecha de Corte con Proveedor *</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="acc-cutoff"
                  type="date"
                  value={supplierCutoffDate}
                  onChange={(e) => setSupplierCutoffDate(e.target.value)}
                  className="pl-8 h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-notes">Notas / Observaciones del Proveedor</Label>
            <Input
              id="acc-notes"
              placeholder="Ej: Comprada a Juan Pérez, garantía 30 días con reemplazo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="p-3 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => createAccountMutation.mutate()}
            disabled={createAccountMutation.isPending}
            className="gap-1.5 shadow-xs font-semibold"
          >
            {createAccountMutation.isPending ? "Creando..." : "Crear Cuenta y Pantallas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
