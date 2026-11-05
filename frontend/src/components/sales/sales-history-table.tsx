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
  User,
  Clock,
  Receipt,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
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

  // Dialogs state
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<SaleTransaction | null>(null);
  const [selectedPaymentSale, setSelectedPaymentSale] = useState<SaleTransaction | null>(null);

  // Void sale mutation
  const voidSaleMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.post(`/sales/${id}/void`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-summary"] });
    },
  });

  const handleVoidSale = (sale: SaleTransaction) => {
    const reason = prompt(
      `¿Estás seguro de anular la venta ${sale.documentNumber || sale.orderNumber || sale.id}? El inventario será reintegrado automáticamente.\n\nMotivo de anulación:`
    );
    if (reason && reason.trim()) {
      voidSaleMutation.mutate({ id: sale.id, reason: reason.trim() });
    }
  };

  // Filter
  const term = debouncedSearchTerm.toLowerCase().trim();
  const filteredSales = sales.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (!term) return true;
    const docNumber = (s.documentNumber || s.orderNumber || s.id || "").toLowerCase();
    const customerName = (s.customer?.name || "").toLowerCase();
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
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por comprobante, cliente o cédula..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-8 h-9 text-xs rounded-xl bg-card border-border/80 shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
            className="rounded-xl text-xs px-3.5 h-8 shadow-2xs font-semibold"
          >
            Todas ({sales.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "COMPLETED" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("COMPLETED");
              setPage(1);
            }}
            className="rounded-xl text-xs px-3.5 h-8 shadow-2xs font-semibold"
          >
            Pagadas ({sales.filter((s) => s.status === "COMPLETED").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PARTIALLY_PAID" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("PARTIALLY_PAID");
              setPage(1);
            }}
            className="rounded-xl text-xs px-3.5 h-8 shadow-2xs font-semibold"
          >
            Parciales ({sales.filter((s) => s.status === "PARTIALLY_PAID").length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PENDING_PAYMENT" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("PENDING_PAYMENT");
              setPage(1);
            }}
            className="rounded-xl text-xs px-3.5 h-8 shadow-2xs font-semibold"
          >
            Por Cobrar ({sales.filter((s) => s.status === "PENDING_PAYMENT").length})
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refrescar ventas"
            className="rounded-xl h-8 w-8 ml-1 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Sales Table with Spacious Layout */}
      {isLoading ? (
        <div className="flex h-56 flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Cargando historial de comprobantes...</span>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <h4 className="text-sm font-semibold text-foreground">
            No se encontraron ventas
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            {searchTerm
              ? "No hay resultados para el término de búsqueda ingresado."
              : "Aún no se han emitido ventas bajo esta condición de filtro."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="py-3.5 px-4 text-xs font-semibold">Comprobante</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-semibold">Cliente</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-semibold">Fecha y Hora</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-semibold">Estado</TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-xs font-semibold">Total Facturado</TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-xs font-semibold">Total Pagado</TableHead>
                  <TableHead className="py-3.5 px-4 text-right text-xs font-semibold">Saldo</TableHead>
                  <TableHead className="py-3.5 px-4 text-center text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => {
                  const total = Number(sale.total || 0);
                  const totalPaid = Number(sale.totalCollected ?? sale.totalPaid ?? 0);
                  const pending = Math.max(0, total - totalPaid);
                  const totalBs = (total * exchangeRate).toFixed(2);

                  return (
                    <TableRow
                      key={sale.id}
                      className={`hover:bg-muted/30 transition-colors border-b border-border/60 ${
                        sale.status === "VOIDED" ? "opacity-50" : ""
                      }`}
                    >
                      {/* Comprobante */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold font-mono text-xs text-foreground tracking-tight">
                              {sale.documentNumber || sale.orderNumber || sale.id.slice(0, 8)}
                            </span>
                            {sale.items && (
                              <span className="text-[10px] text-muted-foreground">
                                {sale.items.length} {sale.items.length === 1 ? "artículo" : "artículos"}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Cliente */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-col min-w-[140px]">
                          <span className="font-semibold text-xs text-foreground">
                            {sale.customer
                              ? `${sale.customer.name} ${sale.customer.lastName || ""}`
                              : "Cliente Mostrador"}
                          </span>
                          {sale.customer?.documentId ? (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              CI/RIF: {sale.customer.documentId}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Consumidor Final
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Fecha y Hora */}
                      <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {new Date(sale.soldAt).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
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
                            ? "PAGADA"
                            : sale.status === "PARTIALLY_PAID"
                              ? "PAGO PARCIAL"
                              : sale.status === "PENDING_PAYMENT"
                                ? "POR COBRAR"
                                : sale.status === "VOIDED"
                                  ? "ANULADA"
                                  : sale.status}
                        </Badge>
                      </TableCell>

                      {/* Total Facturado */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-foreground font-mono text-sm">
                            ${total.toFixed(2)}
                          </span>
                          {exchangeRate > 1 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Bs. {totalBs}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Pagado */}
                      <TableCell className="py-3.5 px-4 text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                        ${totalPaid.toFixed(2)}
                      </TableCell>

                      {/* Saldo Pendiente */}
                      <TableCell className="py-3.5 px-4 text-right text-xs">
                        {pending > 0.01 ? (
                          <span className="font-bold text-destructive font-mono bg-destructive/10 px-2 py-0.5 rounded-md">
                            ${pending.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono font-medium">$0.00</span>
                        )}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Receipt */}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelectedReceiptSale(sale)}
                            title="Ver Ticket / Comprobante"
                            className="rounded-lg h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {/* Add payment (if pending and not voided) */}
                          {pending > 0.01 && sale.status !== "VOIDED" && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setSelectedPaymentSale(sale)}
                              title="Abonar Pago"
                              className="rounded-lg h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Void sale */}
                          {sale.status !== "VOIDED" && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleVoidSale(sale)}
                              title="Anular Venta"
                              className="rounded-lg h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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

          {/* Sales Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3.5 bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium">
              Mostrando página {page} de {totalPages} ({filteredSales.length} comprobantes)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-8 text-xs rounded-xl px-3 font-semibold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-8 text-xs rounded-xl px-3 font-semibold"
              >
                Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
    </div>
  );
}
