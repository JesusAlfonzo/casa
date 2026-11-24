"use client";

import React, { useState } from "react";
import {
  type SaleTransaction,
  type FinancialAccount,
  type PaymentMethod,
} from "@/types/pos";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Search,
  RefreshCw,
  FileText,
  DollarSign,
  Ban,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Clock,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { SaleReceiptDialog } from "./sale-receipt-dialog";
import { AddPaymentModal } from "./add-payment-modal";

interface SalesHistoryTableProps {
  sales: SaleTransaction[];
  isLoading: boolean;
  onRefresh: () => void;
  isFetching: boolean;
  financialAccounts: FinancialAccount[];
  paymentMethods: PaymentMethod[];
  exchangeRate?: number;
}

export function SalesHistoryTable({
  sales,
  isLoading,
  onRefresh,
  isFetching,
  financialAccounts,
  paymentMethods,
  exchangeRate = 1,
}: SalesHistoryTableProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modales
  const [selectedReceiptSale, setSelectedReceiptSale] =
    useState<SaleTransaction | null>(null);
  const [selectedPaymentSale, setSelectedPaymentSale] =
    useState<SaleTransaction | null>(null);
  const [saleToVoid, setSaleToVoid] = useState<SaleTransaction | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Anular venta
  const voidSaleMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.post(`/sales/${id}/void`, { reason });
    },
    onSuccess: () => {
      toast.success("Venta anulada y productos devueltos al inventario");
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      setSaleToVoid(null);
      setVoidReason("");
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "No se pudo anular la venta"
      );
    },
  });

  const handleConfirmVoid = () => {
    if (!saleToVoid) return;
    const reason = voidReason.trim();
    if (!reason) {
      toast.error("Escribe el motivo de la anulación");
      return;
    }
    voidSaleMutation.mutate({ id: saleToVoid.id, reason });
  };

  // Filtrado
  const term = debouncedSearchTerm.toLowerCase().trim();
  const filteredSales = sales.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (!term) return true;
    const docNumber = (
      s.documentNumber ||
      s.orderNumber ||
      s.id ||
      ""
    ).toLowerCase();
    const customerName = `${s.customer?.name || ""} ${s.customer?.lastName || ""}`
      .toLowerCase()
      .trim();
    const customerDoc = (s.customer?.documentId || "").toLowerCase();
    return (
      docNumber.includes(term) ||
      customerName.includes(term) ||
      customerDoc.includes(term)
    );
  });

  const totalPages = Math.ceil(filteredSales.length / limit) || 1;
  const paginatedSales = filteredSales.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-5">
      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente o cédula..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-9 h-10 text-sm rounded-xl bg-card"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
            className="rounded-xl text-sm px-4 h-9"
          >
            Todas ({sales.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "COMPLETED" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("COMPLETED");
              setPage(1);
            }}
            className="rounded-xl text-sm px-4 h-9"
          >
            Pagadas ({sales.filter((s) => s.status === "COMPLETED").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PARTIALLY_PAID" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("PARTIALLY_PAID");
              setPage(1);
            }}
            className="rounded-xl text-sm px-4 h-9"
          >
            Abonos ({sales.filter((s) => s.status === "PARTIALLY_PAID").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PENDING_PAYMENT" ? "default" : "outline"}
            onClick={() => {
              setStatusFilter("PENDING_PAYMENT");
              setPage(1);
            }}
            className="rounded-xl text-sm px-4 h-9"
          >
            Por cobrar (
            {sales.filter((s) => s.status === "PENDING_PAYMENT").length})
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isFetching}
            title="Actualizar lista"
            className="rounded-xl h-9 w-9"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Tabla del historial */}
      {isLoading ? (
        <div className="flex h-56 flex-col items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Cargando historial de ventas...</span>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center bg-card">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h4 className="text-base font-semibold text-foreground">
            No se encontraron ventas
          </h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm
              ? "Prueba con otro nombre o número de recibo."
              : "Todavía no hay ventas en esta categoría."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="py-3.5 px-4 text-sm font-semibold">
                    Recibo
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-sm font-semibold">
                    Cliente
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-sm font-semibold">
                    Fecha
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-sm font-semibold">
                    Estado
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                    Total
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                    Pagado
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-sm font-semibold">
                    Pendiente
                  </TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-sm font-semibold">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => {
                  const total = Number(sale.total || 0);
                  const totalPaid = Number(
                    sale.totalCollected ?? sale.totalPaid ?? 0
                  );
                  const pending = Math.max(0, total - totalPaid);
                  const totalBs = (total * exchangeRate).toFixed(2);

                  return (
                    <TableRow
                      key={sale.id}
                      className={`hover:bg-muted/30 transition-colors border-b border-border/60 ${
                        sale.status === "VOIDED" ? "opacity-55" : ""
                      }`}
                    >
                      {/* Recibo */}
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold font-mono text-sm text-foreground">
                              {sale.documentNumber ||
                                sale.orderNumber ||
                                sale.id.slice(0, 8)}
                            </span>
                            {sale.items && (
                              <span className="text-xs text-muted-foreground">
                                {sale.items.length}{" "}
                                {sale.items.length === 1
                                  ? "artículo"
                                  : "artículos"}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Cliente */}
                      <TableCell className="py-4 px-4">
                        <div className="flex flex-col min-w-[140px]">
                          <span className="font-medium text-sm text-foreground">
                            {sale.customer
                              ? `${sale.customer.name} ${sale.customer.lastName || ""}`.trim()
                              : "Cliente general"}
                          </span>
                          {sale.customer?.documentId && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {sale.customer.documentId}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Fecha */}
                      <TableCell className="py-4 px-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {new Date(sale.soldAt).toLocaleDateString("es-VE")}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(sale.soldAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="py-4 px-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            sale.status === "COMPLETED"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : sale.status === "PARTIALLY_PAID"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : sale.status === "PENDING_PAYMENT"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "border-destructive/30 bg-destructive/10 text-destructive"
                          }`}
                        >
                          {sale.status === "COMPLETED"
                            ? "Pagada"
                            : sale.status === "PARTIALLY_PAID"
                              ? "Abono parcial"
                              : sale.status === "PENDING_PAYMENT"
                                ? "Por cobrar"
                                : sale.status === "VOIDED"
                                  ? "Anulada"
                                  : sale.status}
                        </Badge>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-foreground font-mono text-sm">
                            ${total.toFixed(2)}
                          </span>
                          {exchangeRate > 1 && (
                            <span className="text-xs text-muted-foreground font-mono">
                              Bs. {totalBs}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Pagado */}
                      <TableCell className="py-4 px-4 text-right font-semibold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        ${totalPaid.toFixed(2)}
                      </TableCell>

                      {/* Pendiente */}
                      <TableCell className="py-4 px-4 text-right text-sm">
                        {pending > 0.01 ? (
                          <span className="font-semibold text-destructive font-mono bg-destructive/10 px-2 py-0.5 rounded-md">
                            ${pending.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono">
                            $0.00
                          </span>
                        )}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedReceiptSale(sale)}
                            title="Ver recibo"
                            className="rounded-lg h-9 w-9 hover:bg-primary/10 hover:text-primary"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {pending > 0.01 && sale.status !== "VOIDED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedPaymentSale(sale)}
                              title="Registrar abono"
                              className="rounded-lg h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}

                          {sale.status !== "VOIDED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSaleToVoid(sale);
                                setVoidReason("");
                              }}
                              title="Anular venta"
                              className="rounded-lg h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({filteredSales.length} ventas)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="h-9 text-sm rounded-xl px-3.5 gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-9 text-sm rounded-xl px-3.5 gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <SaleReceiptDialog
        sale={selectedReceiptSale}
        open={!!selectedReceiptSale}
        onOpenChange={(open) => !open && setSelectedReceiptSale(null)}
        exchangeRate={exchangeRate}
      />

      <AddPaymentModal
        sale={selectedPaymentSale}
        open={!!selectedPaymentSale}
        onOpenChange={(open) => !open && setSelectedPaymentSale(null)}
        financialAccounts={financialAccounts}
        paymentMethods={paymentMethods}
        exchangeRate={exchangeRate}
      />

      {/* Diálogo limpio para anular venta */}
      <Dialog
        open={!!saleToVoid}
        onOpenChange={(open) => {
          if (!open) {
            setSaleToVoid(null);
            setVoidReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3 pr-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Anular venta
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Los productos volverán automáticamente al inventario.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vas a anular el recibo{" "}
              <strong className="text-foreground">
                {saleToVoid?.documentNumber ||
                  saleToVoid?.orderNumber ||
                  saleToVoid?.id}
              </strong>
              .
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="void-reason" className="text-sm font-medium">
                ¿Por qué se anula esta venta? *
              </Label>
              <Input
                id="void-reason"
                placeholder="Ej. Error en el cobro o devolución"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaleToVoid(null);
                setVoidReason("");
              }}
              disabled={voidSaleMutation.isPending}
              className="h-10 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmVoid}
              disabled={voidSaleMutation.isPending || !voidReason.trim()}
              className="h-10 px-5 text-sm font-medium gap-2"
            >
              {voidSaleMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>Confirmar anulación</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
