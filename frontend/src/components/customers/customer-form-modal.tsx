"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Customer, type CreateCustomerDTO } from "@/types/customer";
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
import { User, Phone, Mail, IdCard, MapPin, FileText, CheckCircle2 } from "lucide-react";

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

  // Sync form state when customer prop changes (React 19 render-time adjustment)
  const [prevCustomer, setPrevCustomer] = useState<Customer | null | undefined>(customer);
  const [formData, setFormData] = useState<CreateCustomerDTO>(
    customer
      ? {
          name: customer.name || "",
          lastName: customer.lastName || "",
          documentId: customer.documentId || "",
          phone: customer.phone || "",
          email: customer.email || "",
          address: customer.address || "",
          notes: customer.notes || "",
          isActive: customer.isActive ?? true,
        }
      : emptyForm
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (customer !== prevCustomer) {
    setPrevCustomer(customer);
    setFormData(
      customer
        ? {
            name: customer.name || "",
            lastName: customer.lastName || "",
            documentId: customer.documentId || "",
            phone: customer.phone || "",
            email: customer.email || "",
            address: customer.address || "",
            notes: customer.notes || "",
            isActive: customer.isActive ?? true,
          }
        : emptyForm
    );
    setErrorMsg(null);
  }

  // Mutation to create or update
  const saveMutation = useMutation({
    mutationFn: async (payload: CreateCustomerDTO) => {
      if (isEditing && customer?.id) {
        return api.put<{ success: boolean; data: Customer }>(
          `/api/customers/${customer.id}`,
          payload
        );
      } else {
        return api.post<{ success: boolean; data: Customer }>(
          "/api/customers",
          payload
        );
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
          "Ocurrió un error al procesar el cliente. Por favor verifica los datos."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("El nombre del cliente es obligatorio.");
      return;
    }
    setErrorMsg(null);
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza la información de contacto y fiscal del cliente."
              : "Registra un nuevo cliente para ventas en POS y suscripciones de streaming."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs font-semibold">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-name"
                  placeholder="Ej. Juan"
                  className="pl-9 text-sm"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-lastname" className="text-xs font-semibold">
                Apellido
              </Label>
              <Input
                id="cust-lastname"
                placeholder="Ej. Pérez"
                className="text-sm"
                value={formData.lastName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-doc" className="text-xs font-semibold">
                Cédula / RIF / Pasaporte
              </Label>
              <div className="relative">
                <IdCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-doc"
                  placeholder="Ej. V-12345678"
                  className="pl-9 text-sm"
                  value={formData.documentId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, documentId: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-phone" className="text-xs font-semibold">
                Teléfono / WhatsApp
              </Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-phone"
                  placeholder="Ej. 04121234567"
                  className="pl-9 text-sm"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-email" className="text-xs font-semibold">
              Correo Electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-email"
                type="email"
                placeholder="juan.perez@ejemplo.com"
                className="pl-9 text-sm"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-addr" className="text-xs font-semibold">
              Dirección
            </Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-addr"
                placeholder="Ej. Av. Principal, Edif. A, Apto 4"
                className="pl-9 text-sm"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-notes" className="text-xs font-semibold">
              Notas u Observaciones
            </Label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-notes"
                placeholder="Preferencias de pago, notas sobre suscripciones, etc."
                className="pl-9 text-sm"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cust-active"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="cust-active" className="text-xs font-medium cursor-pointer">
              Cliente Activo (Habilitado para compras y suscripciones)
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saveMutation.isPending
                ? "Guardando..."
                : isEditing
                ? "Actualizar Cliente"
                : "Guardar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
