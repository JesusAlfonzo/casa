"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Customer, type CreateCustomerDTO } from "@/types/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  Mail,
  IdCard,
  MapPin,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: (savedCustomer: Customer) => void;
}

const emptyForm: CreateCustomerDTO = {
  name: "",
  lastName: "",
  documentId: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

export function CustomerFormModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(customer?.id);

  const [prevKey, setPrevKey] = useState<string>("");
  const [formData, setFormData] = useState<CreateCustomerDTO>(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentKey = `${customer?.id || "new"}-${open}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (customer && open) {
      setFormData({
        name: customer.name || "",
        lastName: customer.lastName || "",
        documentId: customer.documentId || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
        isActive: customer.isActive ?? true,
      });
    } else {
      setFormData(emptyForm);
    }
    setErrorMsg(null);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: CreateCustomerDTO) => {
      if (isEditing && customer?.id) {
        return api.put<{ success: boolean; data: Customer }>(
          `/api/customers/${customer.id}`,
          payload
        );
      }
      return api.post<{ success: boolean; data: Customer }>(
        "/api/customers",
        payload
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      if (customer?.id) {
        queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
      }
      onSuccess?.(res.data);
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "No se pudo guardar el cliente. Revisa los datos e intenta de nuevo."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Escribe el nombre del cliente.");
      return;
    }
    setErrorMsg(null);
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Encabezado fijo */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? "Editar cliente" : "Nuevo cliente"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {isEditing
                  ? "Actualiza los datos de contacto de este cliente."
                  : "Anota los datos del cliente para sus compras y cuentas de streaming."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          {/* Cuerpo con scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {errorMsg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name" className="text-sm font-medium">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cust-name"
                    placeholder="Ej. Juan"
                    className="pl-9 h-10 text-sm"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-lastname" className="text-sm font-medium">
                  Apellido
                </Label>
                <Input
                  id="cust-lastname"
                  placeholder="Ej. Pérez"
                  className="h-10 text-sm"
                  value={formData.lastName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone" className="text-sm font-medium">
                  Teléfono / WhatsApp
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cust-phone"
                    placeholder="Ej. 0412-1234567"
                    className="pl-9 h-10 text-sm"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-doc" className="text-sm font-medium">
                  Cédula (opcional)
                </Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cust-doc"
                    placeholder="Ej. V-12345678"
                    className="pl-9 h-10 text-sm"
                    value={formData.documentId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, documentId: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-email" className="text-sm font-medium">
                  Correo (opcional)
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cust-email"
                    type="email"
                    placeholder="juan@correo.com"
                    className="pl-9 h-10 text-sm"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-addr" className="text-sm font-medium">
                  Dirección (opcional)
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cust-addr"
                    placeholder="Ej. Calle 5, Casa 12"
                    className="pl-9 h-10 text-sm"
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-notes" className="text-sm font-medium">
                Notas (opcional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-notes"
                  placeholder="Ej. Suele pagar por pago móvil los días 15"
                  className="pl-9 h-10 text-sm"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label
                  htmlFor="cust-active"
                  className="text-sm font-medium cursor-pointer"
                >
                  Cliente activo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aparece disponible para seleccionar en ventas y streaming.
                </p>
              </div>
              <Switch
                id="cust-active"
                checked={Boolean(formData.isActive)}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          {/* Pie fijo */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-10 px-5 text-sm font-medium gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>
                {saveMutation.isPending
                  ? "Guardando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Guardar cliente"}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
