"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Brand } from "@/types/inventory";
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
import { Tag, CheckCircle2 } from "lucide-react";

interface BrandFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand | null;
  onSuccess?: (saved: Brand) => void;
}

interface FormState {
  name: string;
  description: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  isActive: true,
};

export function BrandFormModal({
  open,
  onOpenChange,
  brand,
  onSuccess,
}: BrandFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(brand?.id);

  // Sync safely for React 19
  const [prevBrand, setPrevBrand] = useState<Brand | null | undefined>(brand);
  const [formData, setFormData] = useState<FormState>(
    brand
      ? {
          name: brand.name || "",
          description: brand.description || "",
          isActive: brand.isActive ?? true,
        }
      : emptyForm
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (brand !== prevBrand) {
    setPrevBrand(brand);
    setFormData(
      brand
        ? {
            name: brand.name || "",
            description: brand.description || "",
            isActive: brand.isActive ?? true,
          }
        : emptyForm
    );
    setErrorMsg(null);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const body = {
        name: payload.name.trim(),
        description: payload.description.trim() || undefined,
        isActive: payload.isActive,
      };

      if (isEditing && brand?.id) {
        return api.put<{ success: boolean; data: Brand }>(
          `/brands/${brand.id}`,
          body
        );
      } else {
        return api.post<{ success: boolean; data: Brand }>(
          "/brands",
          body
        );
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["brands-all"] });
      queryClient.invalidateQueries({ queryKey: ["brands-list"] });
      onSuccess?.(res.data);
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "Error al guardar la marca. Comprueba que el nombre sea único."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("El nombre de la marca es obligatorio.");
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
            <Tag className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Marca" : "Nueva Marca"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza el nombre comercial y descripción de la marca."
              : "Registra fabricantes y marcas para asociar a los productos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="brand-name" className="text-xs font-semibold">
              Nombre de la Marca <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand-name"
              placeholder="Ej. Sony, Apple, Samsung, Xiaomi"
              className="text-sm font-medium"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-desc" className="text-xs font-semibold">
              Descripción (Opcional)
            </Label>
            <Input
              id="brand-desc"
              placeholder="País de origen, líneas destacadas..."
              className="text-sm"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="brand-active"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="brand-active" className="text-xs font-medium cursor-pointer">
              Marca Activa
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
                ? "Actualizar Marca"
                : "Guardar Marca"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
