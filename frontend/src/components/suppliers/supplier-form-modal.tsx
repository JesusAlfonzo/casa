"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type SupplierItem,
  type CreateSupplierDTO,
  type UpdateSupplierDTO,
} from "@/types/supplier";
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
import { Building2, Loader2 } from "lucide-react";

interface SupplierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierToEdit?: SupplierItem | null;
}

export function SupplierFormModal({
  open,
  onOpenChange,
  supplierToEdit,
}: SupplierFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!supplierToEdit;

  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [prevKey, setPrevKey] = useState<string | null>(null);

  const currentKey = supplierToEdit ? `${supplierToEdit.id}-${open}` : `new-${open}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (supplierToEdit && open) {
      setLegalName(supplierToEdit.legalName);
      setTradeName(supplierToEdit.tradeName || "");
      setTaxId(supplierToEdit.taxId || "");
      setContactName(supplierToEdit.contactName || "");
      setPhone(supplierToEdit.phone || "");
      setEmail(supplierToEdit.email || "");
      setAddress(supplierToEdit.address || "");
      setNotes(supplierToEdit.notes || "");
      setIsActive(supplierToEdit.isActive);
    } else {
      setLegalName("");
      setTradeName("");
      setTaxId("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      setIsActive(true);
    }
  }

  const supplierMutation = useMutation({
    mutationFn: (body: CreateSupplierDTO | UpdateSupplierDTO) => {
      if (isEditing && supplierToEdit) {
        return api.put(`/suppliers/${supplierToEdit.id}`, body);
      }
      return api.post("/suppliers", body);
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Proveedor actualizado exitosamente"
          : "Proveedor creado exitosamente"
      );
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-detail", supplierToEdit?.id],
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al procesar el proveedor");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!legalName.trim()) {
      toast.error("La razón social es obligatoria");
      return;
    }

    supplierMutation.mutate({
      legalName: legalName.trim(),
      tradeName: tradeName.trim() || undefined,
      taxId: taxId.trim() || undefined,
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim().toLowerCase() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing
                  ? `Editar Proveedor: ${supplierToEdit.legalName}`
                  : "Registrar Nuevo Proveedor"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ingrese los datos fiscales y de contacto para compras y catálogo comercial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Razón Social y Nombre Comercial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Razón Social (Legal) *</Label>
              <Input
                placeholder="Distribuidora Mayorista C.A."
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre Comercial / Fantasía</Label>
              <Input
                placeholder="Mayorista Digital"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
              />
            </div>
          </div>

          {/* RIF / Tax ID y Persona de Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">RIF / NIT / Identificación Fiscal</Label>
              <Input
                placeholder="J-12345678-9"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Persona de Contacto</Label>
              <Input
                placeholder="Ing. Pedro Ramírez"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
          </div>

          {/* Teléfono y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono de Contacto</Label>
              <Input
                placeholder="+58 424 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Correo Electrónico</Label>
              <Input
                type="email"
                placeholder="ventas@proveedor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dirección Fiscal / Despacho</Label>
            <Input
              placeholder="Av. Principal, Edificio Central, Piso 2, Caracas"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Notas / Condiciones Comerciales */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observaciones / Condiciones Comerciales</Label>
            <textarea
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ej: Días de crédito 15 días, entrega en almacén principal, pagos vía transferencia BCV o USDT..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-medium text-foreground">
                Proveedor habilitado para operaciones de compra
              </span>
            </label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={supplierMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={supplierMutation.isPending}>
              {supplierMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Guardar Cambios" : "Registrar Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
