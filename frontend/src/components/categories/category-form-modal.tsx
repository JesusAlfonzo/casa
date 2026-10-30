"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Category } from "@/types/inventory";
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
import { Layers, CheckCircle2 } from "lucide-react";

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  existingCategories: Category[];
  onSuccess?: (saved: Category) => void;
}

interface FormState {
  code: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  code: "",
  name: "",
  slug: "",
  description: "",
  parentId: "",
  isActive: true,
};

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  existingCategories,
  onSuccess,
}: CategoryFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(category?.id);

  // Sync safely for React 19
  const [prevCategory, setPrevCategory] = useState<Category | null | undefined>(category);
  const [formData, setFormData] = useState<FormState>(
    category
      ? {
          code: category.code || "",
          name: category.name || "",
          slug: category.slug || "",
          description: category.description || "",
          parentId: category.parentId || "",
          isActive: category.isActive ?? true,
        }
      : emptyForm
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (category !== prevCategory) {
    setPrevCategory(category);
    setFormData(
      category
        ? {
            code: category.code || "",
            name: category.name || "",
            slug: category.slug || "",
            description: category.description || "",
            parentId: category.parentId || "",
            isActive: category.isActive ?? true,
          }
        : emptyForm
    );
    setErrorMsg(null);
  }

  // Auto-generate slug and code on name change
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const code =
      formData.code ||
      name
        .substring(0, 4)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug && isEditing ? prev.slug : slug,
      code: prev.code && isEditing ? prev.code : code,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const body = {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        slug: payload.slug.trim().toLowerCase(),
        description: payload.description.trim() || undefined,
        parentId: payload.parentId || null,
        isActive: payload.isActive,
      };

      if (isEditing && category?.id) {
        return api.put<{ success: boolean; data: Category }>(
          `/categories/${category.id}`,
          body
        );
      } else {
        return api.post<{ success: boolean; data: Category }>(
          "/categories",
          body
        );
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      onSuccess?.(res.data);
      onOpenChange(false);
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(
        err.message ||
          "Error al guardar la categoría. Comprueba que el código y slug sean únicos."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("El nombre de la categoría es obligatorio.");
      return;
    }
    if (!formData.code.trim()) {
      setErrorMsg("El código de la categoría es obligatorio.");
      return;
    }
    setErrorMsg(null);
    saveMutation.mutate(formData);
  };

  // Filter out self when editing to avoid circular hierarchy
  const availableParents = existingCategories.filter(
    (c) => !category?.id || c.id !== category.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la categoría o su jerarquía."
              : "Organiza tus productos por familias y líneas de catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-xs font-semibold">
              Nombre de Categoría <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              placeholder="Ej. Audio y Sonido"
              className="text-sm font-medium"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-code" className="text-xs font-semibold">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-code"
                placeholder="Ej. AUDI"
                className="font-mono text-sm"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-slug" className="text-xs font-semibold">
                Slug (URL / Identificador)
              </Label>
              <Input
                id="cat-slug"
                placeholder="audio-y-sonido"
                className="font-mono text-sm text-muted-foreground"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-parent" className="text-xs font-semibold">
              Categoría Padre (Opcional)
            </Label>
            <select
              id="cat-parent"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.parentId}
              onChange={(e) =>
                setFormData({ ...formData, parentId: e.target.value })
              }
            >
              <option value="">Ninguna (Categoría Raíz)</option>
              {availableParents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-desc" className="text-xs font-semibold">
              Descripción
            </Label>
            <Input
              id="cat-desc"
              placeholder="Breve detalle sobre los productos incluidos..."
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
              id="cat-active"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="cat-active" className="text-xs font-medium cursor-pointer">
              Categoría Activa en catálogo
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
                ? "Actualizar Categoría"
                : "Guardar Categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
