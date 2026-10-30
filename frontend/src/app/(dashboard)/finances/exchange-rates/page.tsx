"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ExchangeRate } from "@/types/finance";
import { ExchangeRateFormModal } from "@/components/finances/exchange-rate-form-modal";
import {
  BadgeDollarSign,
  Plus,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ExchangeRatesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "HISTORICAL">("ALL");
  const limit = 12;

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialPair, setInitialPair] = useState<{ sourceId: string; targetId: string } | undefined>(undefined);

  const [rateToDelete, setRateToDelete] = useState<ExchangeRate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Consulta de Tasas de Cambio
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["exchange-rates", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter === "ACTIVE") params.append("isActive", "true");
      if (statusFilter === "HISTORICAL") params.append("isActive", "false");

      return api.get<{
        success: boolean;
        data: ExchangeRate[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/exchange-rates?${params.toString()}`);
    },
  });

  const rates = data?.data || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Tasas activas para tarjetas de cabecera
  const activeRates = rates.filter((r) => r.isActive);

  // Mutación para eliminar tasa
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exchange-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-rates"] });
      toast.success("Tasa de cambio eliminada");
      setIsDeleteDialogOpen(false);
      setRateToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al eliminar la tasa de cambio");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Acciones Principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Tasas de Cambio
            </h2>
            <Badge variant="secondary" className="text-xs">
              {meta.total} {meta.total === 1 ? "registro" : "registros"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Control de paridades cambiarias (USD, VES, USDT) utilizadas para la conversión y facturación multimoneda.
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
              setInitialPair(undefined);
              setIsFormOpen(true);
            }}
            className="h-9 gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Fijar Nueva Tasa</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Tasas Vigentes Destacadas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeRates.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3 border-dashed border-border bg-muted/20">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <BadgeDollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    No hay tasas de cambio activas configuradas
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Fija la tasa oficial o de mercado para permitir cobros en Bolívares o USDT.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setInitialPair(undefined);
                  setIsFormOpen(true);
                }}
                className="text-xs shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Fijar Tasa Ahora
              </Button>
            </CardContent>
          </Card>
        ) : (
          activeRates.map((r) => {
            const sourceCode = r.sourceCurrency?.code || "USD";
            const targetCode = r.targetCurrency?.code || "VES";
            const targetSymbol = r.targetCurrency?.symbol || "Bs.";
            const rateValue = Number(r.rate || 0);

            return (
              <Card
                key={r.id}
                className="border-primary/40 bg-card shadow-xs relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-10 w-10 bg-primary/10 rounded-bl-full flex items-start justify-end p-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {sourceCode} / {targetCode}
                    </span>
                    <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-primary">
                      TASA ACTIVA
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Desde: {new Date(r.effectiveFrom).toLocaleDateString()}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                      {targetSymbol} {rateValue.toFixed(r.targetCurrency?.decimals || 2)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      x 1 {sourceCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <span className="text-muted-foreground truncate max-w-[170px]">
                      Fuente: {r.source || "Interna"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInitialPair({
                          sourceId: r.sourceCurrencyId,
                          targetId: r.targetCurrencyId,
                        });
                        setIsFormOpen(true);
                      }}
                      className="h-7 text-xs px-2"
                    >
                      Actualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Historial de Tasas */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Historial de Cotizaciones y Tasas
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Registro histórico utilizado para auditar ventas y compras en la fecha de emisión.
            </p>
          </div>

          <div className="w-44">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "HISTORICAL");
                setPage(1);
              }}
            >
              <option value="ALL">Todas las Tasas</option>
              <option value="ACTIVE">Solo Tasas Activas</option>
              <option value="HISTORICAL">Solo Históricas</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Par Cambiario</TableHead>
                  <TableHead>Tasa / Cotización</TableHead>
                  <TableHead>Fuente / Origen</TableHead>
                  <TableHead>Vigente Desde</TableHead>
                  <TableHead>Vigente Hasta</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-[60px] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={7} className="h-12 text-center">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BadgeDollarSign className="h-8 w-8 text-muted-foreground/60" />
                        <p className="text-sm font-medium text-foreground">
                          No hay historial de tasas registrado
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((r) => {
                    const source = r.sourceCurrency?.code || "USD";
                    const target = r.targetCurrency?.code || "VES";
                    const targetSymbol = r.targetCurrency?.symbol || "Bs.";
                    const rateNum = Number(r.rate || 0);

                    return (
                      <TableRow key={r.id} className="transition-colors">
                        {/* Par */}
                        <TableCell>
                          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                            <span>{source}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{target}</span>
                          </div>
                        </TableCell>

                        {/* Valor */}
                        <TableCell>
                          <div className="font-mono text-sm font-bold text-foreground">
                            {targetSymbol} {rateNum.toFixed(r.targetCurrency?.decimals || 4)}
                          </div>
                        </TableCell>

                        {/* Fuente */}
                        <TableCell className="text-xs text-muted-foreground">
                          {r.source || "No especificada"}
                        </TableCell>

                        {/* Desde */}
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(r.effectiveFrom).toLocaleString()}
                        </TableCell>

                        {/* Hasta */}
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.effectiveTo ? (
                            new Date(r.effectiveTo).toLocaleString()
                          ) : (
                            <span className="text-primary font-medium">Vigente actual</span>
                          )}
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="text-center">
                          <Badge
                            variant={r.isActive ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {r.isActive ? "Activa" : "Histórica"}
                          </Badge>
                        </TableCell>

                        {/* Eliminar */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setRateToDelete(r);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Página {meta.page} de {meta.totalPages} ({meta.total} tasas totales)
              </span>
              <div className="flex items-center gap-1">
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
      <ExchangeRateFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialPair={initialPair}
      />

      {/* Diálogo Eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive">
              ¿Eliminar Registro de Tasa?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Estás a punto de eliminar el registro de tasa de cambio de{" "}
              <strong>
                {rateToDelete?.sourceCurrency?.code} a {rateToDelete?.targetCurrency?.code}
              </strong>{" "}
              ({rateToDelete?.rate}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (rateToDelete) deleteMutation.mutate(rateToDelete.id);
              }}
            >
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
