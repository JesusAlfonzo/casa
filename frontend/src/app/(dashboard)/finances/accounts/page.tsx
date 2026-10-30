"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type FinancialAccount,
  type FinancialAccountType,
} from "@/types/finance";
import { AccountFormModal } from "@/components/finances/account-form-modal";
import { AccountAdjustModal } from "@/components/finances/account-adjust-modal";
import { CreateTransactionModal } from "@/components/finances/create-transaction-modal";
import {
  Landmark,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  Scale,
  Wallet,
  DollarSign,
  Receipt,
  Building,
  ChevronLeft,
  ChevronRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const TYPE_CONFIG: Record<
  FinancialAccountType,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  DOMESTIC_BANK: {
    label: "Banco Nacional",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Building,
  },
  INTERNATIONAL_BANK: {
    label: "Banco Internacional",
    badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: Landmark,
  },
  DIGITAL_WALLET: {
    label: "Billetera Digital",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: Wallet,
  },
  CASH_REGISTER: {
    label: "Caja de Efectivo",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: DollarSign,
  },
};

export default function FinancialAccountsPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState<FinancialAccount | null>(null);

  const [isTxOpen, setIsTxOpen] = useState(false);

  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Consulta de Cuentas Financieras
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["financial-accounts", page, searchTerm, selectedType, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (searchTerm) params.append("search", searchTerm);
      if (selectedType !== "ALL") params.append("type", selectedType);
      if (statusFilter === "ACTIVE") params.append("isActive", "true");
      if (statusFilter === "INACTIVE") params.append("isActive", "false");

      return api.get<{
        success: boolean;
        data: FinancialAccount[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(`/financial-accounts?${params.toString()}`);
    },
  });

  const accounts = data?.data || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Mutación para Cambiar Estado
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/financial-accounts/${id}/status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Estado de la cuenta actualizado");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al cambiar estado");
    },
  });

  // Mutación para Eliminar Cuenta
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financial-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Cuenta financiera eliminada");
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo eliminar la cuenta financiera");
    },
  });

  // Métricas rápidas de los datos cargados
  const totalInUsd = accounts
    .filter((a) => a.currency?.code === "USD" || a.currency?.isBase)
    .reduce((acc, curr) => acc + Number(curr.currentBalance || 0), 0);

  const totalInVes = accounts
    .filter((a) => a.currency?.code === "VES")
    .reduce((acc, curr) => acc + Number(curr.currentBalance || 0), 0);

  const banksCount = accounts.filter(
    (a) => a.type === "DOMESTIC_BANK" || a.type === "INTERNATIONAL_BANK"
  ).length;

  const cashWalletsCount = accounts.filter(
    (a) => a.type === "CASH_REGISTER" || a.type === "DIGITAL_WALLET"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Acciones Principales */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cuentas y Cajas
            </h2>
            <Badge variant="secondary" className="text-xs">
              {meta.total} {meta.total === 1 ? "cuenta" : "cuentas"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Administra tus cuentas bancarias, billeteras digitales y cajas de efectivo para la recepción y pago de fondos.
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
            variant="secondary"
            size="sm"
            onClick={() => setIsTxOpen(true)}
            className="h-9 gap-1.5"
          >
            <Receipt className="h-4 w-4" />
            <span>Nuevo Movimiento</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingAccount(null);
              setIsFormOpen(true);
            }}
            className="h-9 gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Cuenta / Caja</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Fondos USD ($)
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight font-mono">
              ${totalInUsd.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              En cuentas y billeteras denominadas en dólares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Fondos VES (Bs.)
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight font-mono">
              Bs. {totalInVes.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              En bancos nacionales y cajas en Bolívares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Bancos Operativos
            </CardTitle>
            <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {banksCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cuentas bancarias nacionales e internacionales
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cajas y Billeteras
            </CardTitle>
            <div className="rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {cashWalletsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Efectivo en caja chica, Binance y Zelle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, banco o titular..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Filtro Tipo */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos los Tipos de Cuenta</option>
                <option value="DOMESTIC_BANK">Bancos Nacionales</option>
                <option value="INTERNATIONAL_BANK">Bancos Internacionales</option>
                <option value="DIGITAL_WALLET">Billeteras Digitales</option>
                <option value="CASH_REGISTER">Cajas de Efectivo</option>
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                  setPage(1);
                }}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Solo Cuentas Activas</option>
                <option value="INACTIVE">Solo Cuentas Inactivas</option>
              </select>
            </div>

            {/* Botón de Limpiar */}
            {(searchTerm || selectedType !== "ALL" || statusFilter !== "ALL") && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedType("ALL");
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Cuentas Financieras */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">Cuenta / Entidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Titular / Identificador</TableHead>
                  <TableHead>Métodos Habilitados</TableHead>
                  <TableHead className="text-right">Saldo Actual</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-[70px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={7} className="h-14 text-center">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Landmark className="h-8 w-8 text-muted-foreground/60" />
                        <p className="text-sm font-medium text-foreground">
                          No se encontraron cuentas financieras
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Crea tu primera cuenta bancaria o caja para habilitar cobros en el punto de venta.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAccount(null);
                            setIsFormOpen(true);
                          }}
                          className="mt-2 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Crear Cuenta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc) => {
                    const typeConfig = TYPE_CONFIG[acc.type] || {
                      label: acc.type,
                      badgeClass: "bg-muted text-muted-foreground",
                      icon: Landmark,
                    };
                    const Icon = typeConfig.icon;
                    const symbol = acc.currency?.symbol || "$";
                    const balance = Number(acc.currentBalance || 0);

                    return (
                      <TableRow key={acc.id} className="transition-colors">
                        {/* Nombre y Entidad */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-foreground block truncate">
                                {acc.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                {acc.bankName && <span>{acc.bankName}</span>}
                                {acc.accountNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[10px]">
                                      {acc.accountNumber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeConfig.badgeClass}`}
                          >
                            {typeConfig.label}
                          </span>
                        </TableCell>

                        {/* Titular e Identificador */}
                        <TableCell>
                          {acc.holderName ? (
                            <div className="text-xs">
                              <span className="text-foreground font-medium block">
                                {acc.holderName}
                              </span>
                              {acc.identifier && (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {acc.identifier}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No especificado
                            </span>
                          )}
                        </TableCell>

                        {/* Métodos de Pago */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {acc.paymentMethods && acc.paymentMethods.length > 0 ? (
                              acc.paymentMethods
                                .filter((pm) => pm.isActive)
                                .map((pm) => (
                                  <Badge
                                    key={pm.id}
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 font-normal"
                                  >
                                    {pm.paymentMethod.name}
                                  </Badge>
                                ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Todos permitidos
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Saldo Actual */}
                        <TableCell className="text-right">
                          <div className="font-mono text-sm font-bold text-foreground">
                            {symbol} {balance.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {acc.currency?.code || "USD"}
                          </span>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="text-center">
                          <Badge
                            variant={acc.isActive ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {acc.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setAdjustingAccount(acc);
                                  setIsAdjustOpen(true);
                                }}
                              >
                                <Scale className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                Ajustar Saldo / Arqueo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingAccount(acc);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                Editar Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate(acc.id)}
                              >
                                <Power className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                {acc.isActive ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setAccountToDelete(acc);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Eliminar Cuenta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                Página {meta.page} de {meta.totalPages} ({meta.total} cuentas totales)
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
      <AccountFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        account={editingAccount}
      />

      <AccountAdjustModal
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        account={adjustingAccount}
      />

      <CreateTransactionModal
        open={isTxOpen}
        onOpenChange={setIsTxOpen}
      />

      {/* Confirmación de Eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive">
              ¿Eliminar Cuenta Financiera?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Estás a punto de eliminar la cuenta{" "}
              <strong>{accountToDelete?.name}</strong>. Si la cuenta ya registra
              transacciones históricas, se recomienda únicamente desactivarla para
              mantener la integridad de los balances.
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
                if (accountToDelete) deleteMutation.mutate(accountToDelete.id);
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
