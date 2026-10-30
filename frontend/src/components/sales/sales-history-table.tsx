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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
  const filteredSales = sales.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    const term = searchTerm.toLowerCase();
    const docNumber = (s.documentNumber || s.orderNumber || s.id || "").toLowerCase();
    const customerName = (s.customer?.name || "").toLowerCase();
    const customerDoc = (s.customer?.documentId || "").toLowerCase();
    return (
      docNumber.includes(term) ||
      customerName.includes(term) ||
      customerDoc.includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por orden, cliente o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("ALL")}
            className="rounded-full text-xs px-2.5"
          >
            Todas
          </Button>
          <Button
            type="button"
            variant={statusFilter === "COMPLETED" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("COMPLETED")}
            className="rounded-full text-xs px-2.5"
          >
            Pagadas
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PARTIALLY_PAID" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("PARTIALLY_PAID")}
            className="rounded-full text-xs px-2.5"
          >
            Parciales
          </Button>
          <Button
            type="button"
            variant={statusFilter === "PENDING_PAYMENT" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("PENDING_PAYMENT")}
            className="rounded-full text-xs px-2.5"
          >
            Pendientes
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refrescar"
            className="ml-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Cargando ventas...
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <ShoppingCart className="h-9 w-9 text-muted-foreground mb-2" />
          <h4 className="text-sm font-semibold text-foreground">
            No se encontraron ventas
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            {searchTerm
              ? "No hay resultados para la búsqueda ingresada."
              : "Aún no se han registrado transacciones con este filtro."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Comprobante</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total Facturado</TableHead>
                <TableHead className="text-right">Total Pagado</TableHead>
                <TableHead className="text-right">Saldo Pendiente</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const total = Number(sale.total || 0);
                const totalPaid = Number(sale.totalPaid || 0);
                const pending = Math.max(0, total - totalPaid);

                return (
                  <TableRow key={sale.id} className={sale.status === "VOIDED" ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {sale.documentNumber || sale.orderNumber || sale.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {sale.customer
                            ? `${sale.customer.name} ${sale.customer.lastName || ""}`
                            : "Cliente Mostrador"}
                        </span>
                        {sale.customer?.documentId && (
                          <span className="text-[10px] text-muted-foreground">
                            {sale.customer.documentId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sale.soldAt).toLocaleDateString()} {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "COMPLETED"
                            ? "secondary"
                            : sale.status === "PARTIALLY_PAID"
                              ? "outline"
                              : sale.status === "PENDING_PAYMENT"
                                ? "outline"
                                : "destructive"
                        }
                        className="text-[10px]"
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
                    <TableCell className="text-right font-semibold text-xs">
                      ${total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ${totalPaid.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {pending > 0.01 ? (
                        <span className="font-bold text-destructive">
                          ${pending.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Receipt */}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setSelectedReceiptSale(sale)}
                          title="Ver Ticket / Comprobante"
                        >
                          <FileText className="h-3.5 w-3.5 text-foreground" />
                        </Button>

                        {/* Add payment (if pending and not voided) */}
                        {pending > 0.01 && sale.status !== "VOIDED" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelectedPaymentSale(sale)}
                            title="Abonar Pago"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Void sale */}
                        {sale.status !== "VOIDED" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleVoidSale(sale)}
                            title="Anular Venta"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="h-3.5 w-3.5" />
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
