"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Customer } from "@/types/pos";
import { UserPlus, User, CreditCard, Phone, Mail } from "lucide-react";
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

interface QuickCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function QuickCustomerModal({
  open,
  onOpenChange,
  onCustomerCreated,
}: QuickCustomerModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("El nombre del cliente es obligatorio.");
      }

      return api.post<Customer>("/customers", {
        name: name.trim(),
        lastName: lastName.trim() || undefined,
        documentId: documentId.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      onCustomerCreated(newCustomer);
      onOpenChange(false);
      setName("");
      setLastName("");
      setDocumentId("");
      setPhone("");
      setEmail("");
      setError(null);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al registrar cliente.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
          </div>
          <DialogDescription>
            Agrega los datos del cliente para asociarlo inmediatamente a la venta y comprobante.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Nombre *</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="cust-name"
                  placeholder="Juan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-lastname">Apellido</Label>
              <Input
                id="cust-lastname"
                placeholder="Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-doc">Cédula / RIF / ID Fiscal</Label>
            <div className="relative">
              <CreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="cust-doc"
                placeholder="V-12345678"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Teléfono (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="cust-phone"
                  placeholder="+58 412..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => createCustomerMutation.mutate()}
            disabled={createCustomerMutation.isPending}
            className="gap-1.5"
          >
            {createCustomerMutation.isPending ? "Guardando..." : "Crear y Seleccionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
