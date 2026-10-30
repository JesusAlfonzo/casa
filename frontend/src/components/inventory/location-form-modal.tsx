"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type LocationWarehouse } from "@/types/inventory";
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
import { Warehouse, CheckCircle2 } from "lucide-react";

interface LocationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: LocationWarehouse | null;
  onSuccess?: (saved: LocationWarehouse) => void;
}

interface FormState {
  code: string;
  name: string;
  address: string;
  isDefault: boolean;
  isActive: boolean;
}

const emptyForm: FormState = {
  code: "",
  name: "",
  address: "",
  isDefault: false,
  isActive: true,
};

export function LocationFormModal({
  open,
  onOpenChange,
  location,
  onSuccess,
}: LocationFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(location?.id);

  // Sync safely for React 19
  const [prevLoc, setPrevLoc] = useState<LocationWarehouse | null | undefined>(location);
  const [formData, setFormData] = useState<FormState>(
    location
      ? {
          code: location.code || "",
          name: location.name || "",
          address: location.address || "",
          isDefault: location.isDefault ?? false,
          isActive: location.isActive ?? true,
        }
      : emptyForm
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (location !== prevLoc) {
    setPrevLoc(location);
    setFormData(
      location
        ? {
            code: location.code || "",
            name: location.name || "",
            address: location.address || "",
            isDefault: location.isDefault ?? false,
            isActive: location.isActive ?? true,
          }
        : emptyForm
    );
    setErrorMsg(null);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const body = {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        address: payload.address.trim() || undefined,
        isDefault: payload.isDefault,
        isActive: payload.isActive,
      };

      if (isEditing && location?.id) {
        return api.put<{ success: boolean; data: LocationWarehouse }>(
          `/locations/${location.id}`,
          body
        );
      } else {
        return api.post<{ success: boolean; data: LocationWarehouse }>(
          "/locations",
          body
        );
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["locations-all"] });
      queryClient.invalidateQueries({ queryKey: ["locations-list"] });
      onSuccess?.(res.data);
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "Error al guardar el almacén. Verifica que el código sea único."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("El nombre del almacén es obligatorio.");
      return;
    }
    if (!formData.code.trim()) {
      setErrorMsg("El código del almacén es obligatorio.");
      return;
    }
    setErrorMsg(null);
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Warehouse className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Almacén / Depósito" : "Nuevo Almacén / Depósito"}
          </DialogTitle>
          <DialogDescription>
            Configura centros de almacenamiento físicos o sucursales de despacho.
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
              <Label htmlFor="loc-code" className="text-xs font-semibold">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-code"
                placeholder="Ej. ALM-01"
                className="font-mono text-sm uppercase"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-name" className="text-xs font-semibold">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-name"
                placeholder="Ej. Almacén Central"
                className="text-sm font-medium"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-addr" className="text-xs font-semibold">
              Dirección Física
            </Label>
            <Input
              id="loc-addr"
              placeholder="Ej. Galpón 4, Zona Industrial..."
              className="text-sm"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="loc-default"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="loc-default" className="text-xs font-medium cursor-pointer">
                Almacén Principal por Defecto (Entrada automática de compras)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="loc-active"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="loc-active" className="text-xs font-medium cursor-pointer">
                Almacén Activo y habilitado para inventario
              </Label>
            </div>
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
                ? "Actualizar Almacén"
                : "Guardar Almacén"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
