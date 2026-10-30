"use client";

import React from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">
                  {supplier?.legalName}
                </SheetTitle>
                {supplier?.tradeName && (
                  <SheetDescription className="text-xs">
                    {supplier.tradeName}
                  </SheetDescription>
                )}
              </div>
            </div>

            {supplier && (
              <Badge
                variant={supplier.isActive ? "secondary" : "destructive"}
                className="text-[10px]"
              >
                {supplier.isActive ? "ACTIVO" : "INACTIVO"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !supplier ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontró información del proveedor.
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-xs">
            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <Button
                variant={supplier.isActive ? "destructive" : "default"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                )}
                {supplier.isActive ? "Desactivar Proveedor" : "Activar Proveedor"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onEdit?.()}
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>

              <Button
                size="sm"
                className="text-xs shadow-xs"
                onClick={() => onLinkProduct?.()}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Vincular Producto
              </Button>
            </div>

            {/* General Info Card */}
            <div className="rounded-lg border border-border p-3.5 space-y-2.5 bg-card">
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

              <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Registrado en:
                </span>
                <span className="font-medium text-foreground">
                  {new Date(supplier.createdAt).toLocaleDateString("es-VE")}
                </span>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border p-2.5 bg-muted/20 text-center">
                <Package className="h-4 w-4 mx-auto text-primary" />
                <span className="text-base font-bold text-foreground block mt-1">
                  {supplier._count?.products || 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Productos</span>
              </div>

              <div className="rounded-lg border border-border p-2.5 bg-muted/20 text-center">
                <ShoppingBag className="h-4 w-4 mx-auto text-emerald-500" />
                <span className="text-base font-bold text-foreground block mt-1">
                  {supplier._count?.purchases || 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Compras</span>
              </div>

              <div className="rounded-lg border border-border p-2.5 bg-muted/20 text-center">
                <Tv className="h-4 w-4 mx-auto text-purple-500" />
                <span className="text-base font-bold text-foreground block mt-1">
                  {supplier._count?.streamingAccounts || 0}
                </span>
                <span className="text-[10px] text-muted-foreground">Streaming</span>
              </div>
            </div>

            {/* Tabs for Linked Products & Recent Purchases */}
            <Tabs defaultValue="products" className="space-y-3">
              <TabsList className="w-full bg-muted">
                <TabsTrigger value="products" className="flex-1 text-xs">
                  Productos ({supplier.products?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="purchases" className="flex-1 text-xs">
                  Compras Recientes ({supplier.purchases?.length || 0})
                </TabsTrigger>
                {supplier.notes && (
                  <TabsTrigger value="notes" className="flex-1 text-xs">
                    Notas
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tab 1: Productos vinculados */}
              <TabsContent value="products" className="space-y-2">
                {!supplier.products || supplier.products.length === 0 ? (
                  <div className="rounded-lg border border-border p-6 text-center text-xs text-muted-foreground">
                    Este proveedor no tiene productos vinculados en el catálogo aún.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLinkProduct?.()}
                        className="text-xs h-7"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Vincular Ahora
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {supplier.products.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border p-2.5 bg-card flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs truncate">
                              {item.product.name}
                            </span>
                            {(item.isPrimarySupplier || item.isPrimary) && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 font-mono"
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
                            <span className="text-[10px] text-muted-foreground block">
                              Entrega: {item.leadTimeDays}d
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Compras recientes */}
              <TabsContent value="purchases" className="space-y-2">
                {!supplier.purchases || supplier.purchases.length === 0 ? (
                  <div className="rounded-lg border border-border p-6 text-center text-xs text-muted-foreground">
                    No se han registrado órdenes de compra con este proveedor.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {supplier.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-border p-2.5 bg-card flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
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
                              className="text-[9px] px-1 py-0"
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
              </TabsContent>

              {/* Tab 3: Notas */}
              {supplier.notes && (
                <TabsContent value="notes" className="space-y-2">
                  <div className="rounded-lg border border-border p-3 bg-muted/20 text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {supplier.notes}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
