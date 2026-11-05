"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type PaymentTransaction,
  type PaymentFlowType,
  type FinancialAccount,
} from "@/types/finance";
import { CreateTransactionModal } from "@/components/finances/create-transaction-modal";
import { TransactionDetailSheet } from "@/components/finances/transaction-detail-sheet";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Receipt,
  Search,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PaymentTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  // Delay de 400ms para evitar consultas continuas en cada pulsación del buscador
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [flowFilter, setFlowFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [defaultFlow, setDefaultFlow] = useState<PaymentFlowType>("INFLOW");
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Cuentas para filtro
  const { data: accountsData } = useQuery({
    queryKey: ["financial-accounts-list-filters"],
    queryFn: async () => {
      const res = await api.get<{ data: FinancialAccount[] } | FinancialAccount[]>(
        "/financial-accounts?limit=100"
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: FinancialAccount[] }).data)) {
        return (res as { data: FinancialAccount[] }).data;
      }
      return [];
    },
  });

  const accounts = Array.isArray(accountsData) ? accountsData : [];

  // Consulta de Transacciones de Pago con búsqueda con retardo (debouncedSearch)
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "payment-transactions",
      page,
      debouncedSearch,
      flowFilter,
      statusFilter,
      accountFilter,
      fromDate,
      toDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (flowFilter !== "ALL") params.append("flowType", flowFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (accountFilter !== "ALL") params.append("financialAccountId", accountFilter);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      return api.get<{
        success: boolean;
        data: PaymentTransaction[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/payment-transactions?${params.toString()}`);
    },
  });

  const transactions = data?.data || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Totales de la página actual o listado
  const totalInflow = transactions
    .filter((t) => t.flowType === "INFLOW" && t.status === "VERIFIED")
    .reduce((acc, curr) => acc + Number(curr.baseCurrencyAmount || curr.amount || 0), 0);

  const totalOutflow = transactions
    .filter((t) => t.flowType === "OUTFLOW" && t.status === "VERIFIED")
    .reduce((acc, curr) => acc + Number(curr.baseCurrencyAmount || curr.amount || 0), 0);

  const netFlow = totalInflow - totalOutflow;

  return (
    <div className="space-y-6">
      {/* Header & Acciones Principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pagos y Cobros
            </h2>
            <Badge variant="secondary" className="text-xs">
              {meta.total} {meta.total === 1 ? "movimiento" : "movimientos"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoría de ingresos por ventas, egresos por compras a proveedores y movimientos directos de tesorería.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setDefaultFlow("INFLOW");
              setIsCreateOpen(true);
            }}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Registrar Ingreso</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setDefaultFlow("OUTFLOW");
              setIsCreateOpen(true);
            }}
            className="h-9 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Registrar Egreso</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid con espaciado amplio */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Cobrado / Ingresos (Base $)
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              +${totalInflow.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Entradas liquidadas en el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-rose-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Pagado / Egresos (Base $)
            </CardTitle>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight font-mono text-rose-600 dark:text-rose-400">
              -${totalOutflow.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Salidas a proveedores y gastos liquidados
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Flujo de Caja Neto
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                netFlow >= 0
                  ? "text-foreground"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {netFlow >= 0 ? "+" : ""}${netFlow.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Diferencia neta entre cobros y desembolsos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Buscador con delay debounce */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por referencia o notas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 text-xs h-9"
              />
              {searchTerm !== debouncedSearch && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Filtro Flujo */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 shadow-2xs"
                value={flowFilter}
                onChange={(e) => {
                  setFlowFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos los Movimientos (Ingreso/Egreso)</option>
                <option value="INFLOW">Solo Ingresos / Cobros</option>
                <option value="OUTFLOW">Solo Egresos / Pagos</option>
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 shadow-2xs"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="VERIFIED">Verificados / Liquidados</option>
                <option value="PENDING">Pendientes de Acreditación</option>
                <option value="REFUNDED">Anulados / Reembolsados</option>
                <option value="REJECTED">Rechazados</option>
              </select>
            </div>

            {/* Filtro Cuenta Financiera */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 shadow-2xs"
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todas las Cuentas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency?.code || "USD"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de Fechas y Limpieza */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Rango de Fecha:</span>
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-38 text-xs"
              />
              <span className="text-muted-foreground font-medium">hasta</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-38 text-xs"
              />
            </div>

            {(searchTerm ||
              flowFilter !== "ALL" ||
              statusFilter !== "ALL" ||
              accountFilter !== "ALL" ||
              fromDate ||
              toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFlowFilter("ALL");
                  setStatusFilter("ALL");
                  setAccountFilter("ALL");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Transacciones Espaciosa y Cómoda */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1020px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="h-12 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[130px]">
                    Fecha
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[120px]">
                    Flujo
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[220px]">
                    Cuenta Financiera
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[180px]">
                    Método & Referencia
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Concepto / Operación
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-[140px]">
                    Monto
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-[120px]">
                    Estado
                  </TableHead>
                  <TableHead className="h-12 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-[90px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/60">
                      <TableCell colSpan={8} className="py-5 px-5 text-center">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-muted/60 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="text-sm font-semibold text-foreground">
                          Error al cargar transacciones
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(error as Error)?.message || "Ocurrió un error inesperado al consultar los movimientos."}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refetch()}
                          className="mt-2 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Reintentar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Receipt className="h-9 w-9 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">
                          No se encontraron transacciones registradas
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Las ventas cobradas, compras a proveedores y movimientos directos liquidados se reflejarán aquí.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDefaultFlow("INFLOW");
                              setIsCreateOpen(true);
                            }}
                            className="text-xs"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Nuevo Ingreso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDefaultFlow("OUTFLOW");
                              setIsCreateOpen(true);
                            }}
                            className="text-xs"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-rose-600" />
                            Nuevo Egreso
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const isInflow = tx.flowType === "INFLOW";
                    const symbol = tx.currency?.symbol || "$";
                    const amount = Number(tx.amount || 0);

                    return (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/60"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setIsDetailOpen(true);
                        }}
                      >
                        {/* Fecha con espaciado amplio */}
                        <TableCell className="py-4.5 px-5 text-xs text-muted-foreground font-mono">
                          {new Date(tx.paidAt || tx.createdAt).toLocaleDateString("es-VE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </TableCell>

                        {/* Flujo */}
                        <TableCell className="py-4.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              isInflow
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {isInflow ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                            {isInflow ? "Ingreso" : "Egreso"}
                          </span>
                        </TableCell>

                        {/* Cuenta Financiera */}
                        <TableCell className="py-4.5 px-4">
                          <div className="text-xs space-y-0.5">
                            <span className="font-semibold text-foreground block truncate max-w-[200px]">
                              {tx.financialAccount?.name || "Cuenta no disponible"}
                            </span>
                            {tx.financialAccount?.bankName && (
                              <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
                                {tx.financialAccount.bankName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Método & Referencia */}
                        <TableCell className="py-4.5 px-4">
                          <div className="text-xs space-y-0.5">
                            <span className="text-foreground block font-medium">
                              {tx.paymentMethod?.name || "Desconocido"}
                            </span>
                            {tx.reference ? (
                              <span className="font-mono text-[11px] text-muted-foreground block">
                                Ref: {tx.reference}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic block">
                                Sin ref.
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Concepto / Operación */}
                        <TableCell className="py-4.5 px-4">
                          <div className="text-xs max-w-[240px] truncate">
                            {tx.saleId ? (
                              <span className="text-primary font-medium">
                                Cobro Venta #{tx.saleId.slice(0, 8)}
                              </span>
                            ) : tx.purchase ? (
                              <span className="text-primary font-medium">
                                Pago Compra #{tx.purchase.orderNumber}
                              </span>
                            ) : tx.notes ? (
                              <span className="text-foreground">{tx.notes}</span>
                            ) : (
                              <span className="text-muted-foreground/70 italic">
                                Movimiento directo de caja
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Monto */}
                        <TableCell className="py-4.5 px-4 text-right">
                          <div
                            className={`font-mono text-sm font-bold ${
                              isInflow
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isInflow ? "+" : "-"}
                            {symbol} {amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {tx.currency?.code || "USD"}
                          </span>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="py-4.5 px-4 text-center">
                          <Badge
                            variant={
                              tx.status === "VERIFIED"
                                ? "default"
                                : tx.status === "PENDING"
                                  ? "outline"
                                  : "destructive"
                            }
                            className="text-[11px] font-medium px-2 py-0.5"
                          >
                            {tx.status === "VERIFIED"
                              ? "Verificado"
                              : tx.status === "PENDING"
                                ? "Pendiente"
                                : tx.status === "REFUNDED"
                                  ? "Anulado"
                                  : tx.status}
                          </Badge>
                        </TableCell>

                        {/* Acción */}
                        <TableCell className="py-4.5 px-5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs shadow-2xs gap-1 hover:border-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaction(tx);
                              setIsDetailOpen(true);
                            }}
                            title="Ver Detalle de Transacción"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Ver</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación con espaciado amplio */}
          {!isLoading && transactions.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <span className="text-xs text-muted-foreground">
                Página {meta.page} de {meta.totalPages} ({meta.total} transacciones totales)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                  className="h-8 gap-1 text-xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <CreateTransactionModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultFlowType={defaultFlow}
      />

      <TransactionDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}
