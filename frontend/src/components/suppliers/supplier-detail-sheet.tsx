"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type SupplierDetail } from "@/types/supplier";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  ShoppingBag,
  Tv,
  Loader2,
  Edit,
  Plus,
  Power,
  FileText,
} from "lucide-react";

interface SupplierDetailSheetProps {
  supplierId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onLinkProduct?: () => void;
}

export function SupplierDetailSheet({
  supplierId,
  open,
  onOpenChange,
  onEdit,
  onLinkProduct,
}: SupplierDetailSheetProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "purchases" | "notes">("products");

  const { data, isLoading } = useQuery<{ success: boolean; data: SupplierDetail }>({
    queryKey: ["supplier-detail", supplierId],
    queryFn: () => api.get(`/suppliers/${supplierId}`),
    enabled: !!supplierId && open,
  });

  const supplier = data?.data;

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: () => api.patch<{ message?: string }>(`/suppliers/${supplierId}/status`),
    onSuccess: () => {
      toast.success("Estado del proveedor actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({
        queryKey: ["supplier-detail", supplierId],
      });
    },
    onError: (err: unknown) => {
      toast.error((err as Error).message || "Error al modificar estado");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-6 sm:p-8">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <SheetTitle className="text-base sm:text-lg font-bold">
                  {supplier?.legalName}
                </SheetTitle>
                {supplier?.tradeName && (
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    {supplier.tradeName}
                  </SheetDescription>
                )}
              </div>
            </div>

            {supplier && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-0.5",
                  supplier.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-muted bg-muted text-muted-foreground"
                )}
              >
                {supplier.isActive ? "ACTIVO" : "INACTIVO"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !supplier ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontró información del proveedor.
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-xs">
            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={supplier.isActive ? "outline" : "default"}
                size="sm"
                className={cn(
                  "flex-1 text-xs gap-1.5",
                  supplier.isActive && "text-destructive hover:text-destructive"
                )}
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Power className="h-3.5 w-3.5" />
                )}
                {supplier.isActive ? "Desactivar" : "Activar"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => onEdit?.()}
              >
                <Edit className="h-3.5 w-3.5" /> Editar
              </Button>

              <Button
                size="sm"
                className="text-xs shadow-xs gap-1.5"
                onClick={() => onLinkProduct?.()}
              >
                <Plus className="h-3.5 w-3.5" /> Vincular Producto
              </Button>
            </div>

            {/* General Info Card */}
            <div className="rounded-xl border border-border p-4 space-y-3 bg-card shadow-2xs">
              <span className="font-semibold text-foreground text-xs block">
                Ficha de Datos Fiscales y Contacto
              </span>

              {supplier.taxId && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Documento Fiscal / RIF:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {supplier.taxId}
                  </span>
                </div>
              )}

              {supplier.contactName && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Persona de Contacto:</span>
                  <span className="font-medium text-foreground">
                    {supplier.contactName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Teléfono:
                </span>
                <span className="font-medium text-foreground">
                  {supplier.phone || "No especificado"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Correo Electrónico:
                </span>
                <span className="font-medium text-foreground">
                  {supplier.email || "No especificado"}
                </span>
              </div>

              <div className="flex items-start justify-between text-muted-foreground gap-4">
                <span className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3.5 w-3.5" /> Dirección:
                </span>
                <span className="font-medium text-foreground text-right">
                  {supplier.address || "No especificada"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground pt-2 border-t border-border/50">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Registrado en:
                </span>
                <span className="font-medium text-foreground">
                  {new Date(supplier.createdAt).toLocaleDateString("es-VE")}
                </span>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3 bg-card text-center shadow-2xs">
                <Package className="h-4 w-4 mx-auto text-primary" />
                <span className="text-lg font-bold text-foreground block mt-1">
                  {supplier._count?.products || 0}
                </span>
                <span className="text-[11px] text-muted-foreground">Productos</span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-card text-center shadow-2xs">
                <ShoppingBag className="h-4 w-4 mx-auto text-emerald-500" />
                <span className="text-lg font-bold text-foreground block mt-1">
                  {supplier._count?.purchases || 0}
                </span>
                <span className="text-[11px] text-muted-foreground">Compras</span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-card text-center shadow-2xs">
                <Tv className="h-4 w-4 mx-auto text-purple-500" />
                <span className="text-lg font-bold text-foreground block mt-1">
                  {supplier._count?.streamingAccounts || 0}
                </span>
                <span className="text-[11px] text-muted-foreground">Streaming</span>
              </div>
            </div>

            {/* Selection Cards Switcher */}
            <div className="space-y-3">
              <div className={cn("grid gap-2.5", supplier.notes ? "grid-cols-3" : "grid-cols-2")}>
                {/* Card 1: Productos */}
                <button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                    activeTab === "products"
                      ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
                      : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        activeTab === "products"
                          ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold">Productos</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0",
                      activeTab === "products"
                        ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                        : "text-muted-foreground"
                    )}
                  >
                    {supplier.products?.length || 0}
                  </Badge>
                </button>

                {/* Card 2: Compras */}
                <button
                  type="button"
                  onClick={() => setActiveTab("purchases")}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                    activeTab === "purchases"
                      ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
                      : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        activeTab === "purchases"
                          ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold">Compras</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0",
                      activeTab === "purchases"
                        ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                        : "text-muted-foreground"
                    )}
                  >
                    {supplier.purchases?.length || 0}
                  </Badge>
                </button>

                {/* Card 3: Notas (si existen) */}
                {supplier.notes && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("notes")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                      activeTab === "notes"
                        ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
                        : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          activeTab === "notes"
                            ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold">Notas</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Tab 1: Productos vinculados */}
              {activeTab === "products" && (
                <div className="space-y-2 pt-1">
                  {!supplier.products || supplier.products.length === 0 ? (
                    <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                      Este proveedor no tiene productos vinculados en el catálogo aún.
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLinkProduct?.()}
                          className="text-xs h-8 gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Vincular Ahora
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {supplier.products.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border p-3 bg-card flex items-center justify-between gap-2 shadow-2xs hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground text-xs truncate">
                                {item.product.name}
                              </span>
                              {(item.isPrimarySupplier || item.isPrimary) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 font-mono"
                                >
                                  PRINCIPAL
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>SKU: {item.product.sku}</span>
                              {(item.supplierSku || item.supplierProductCode) && (
                                <span>• Ref: {item.supplierSku || item.supplierProductCode}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-foreground text-xs">
                              {item.lastCost !== null && item.lastCost !== undefined
                                ? `${Number(item.lastCost).toFixed(2)} ${
                                    item.currency?.symbol || "$"
                                  }`
                                : "Sin costo"}
                            </div>
                            {item.leadTimeDays && (
                              <span className="text-[10px] text-muted-foreground block mt-0.5">
                                Entrega: {item.leadTimeDays}d
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Compras recientes */}
              {activeTab === "purchases" && (
                <div className="space-y-2 pt-1">
                  {!supplier.purchases || supplier.purchases.length === 0 ? (
                    <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground bg-muted/20">
                      No se han registrado órdenes de compra con este proveedor.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {supplier.purchases.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-border p-3 bg-card flex items-center justify-between gap-2 shadow-2xs hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-xs text-primary">
                                {p.orderNumber}
                              </span>
                              <Badge
                                variant={
                                  p.status === "RECEIVED"
                                    ? "secondary"
                                    : p.status === "CANCELLED"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-[9px] px-1.5 py-0"
                              >
                                {p.status}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              {new Date(p.purchasedAt).toLocaleDateString("es-VE")}
                              {p.warehouse?.name ? ` • ${p.warehouse.name}` : ""}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-xs text-foreground block">
                              {Number(p.total).toFixed(2)} {p.currency?.symbol}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Notas */}
              {activeTab === "notes" && supplier.notes && (
                <div className="pt-1">
                  <div className="rounded-xl border border-border p-4 bg-muted/20 text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {supplier.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
