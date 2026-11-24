"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Customer } from "@/types/pos";
import { UserPlus, User, CreditCard, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        throw new Error("Escribe el nombre del cliente.");
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
      setError(
        err instanceof Error ? err.message : "Error al guardar el cliente."
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Encabezado fijo */}
        <DialogHeader className="shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Nuevo cliente
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Anota sus datos para seleccionarlo en esta venta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-sm font-medium">
                Nombre *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-name"
                  placeholder="Ej. Juan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-10 text-sm"
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
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cust-doc" className="text-sm font-medium">
              Cédula (opcional)
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-doc"
                placeholder="Ej. V-12345678"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="pl-9 h-10 text-sm"
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-email" className="text-sm font-medium">
                Correo (opcional)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="cliente@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pie fijo */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createCustomerMutation.isPending}
            className="h-10 px-4 text-sm"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => createCustomerMutation.mutate()}
            disabled={createCustomerMutation.isPending}
            className="h-10 px-5 text-sm font-medium gap-2"
          >
            {createCustomerMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span>
              {createCustomerMutation.isPending
                ? "Guardando..."
                : "Guardar cliente"}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
