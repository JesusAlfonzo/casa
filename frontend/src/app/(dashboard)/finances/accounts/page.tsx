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
import { AccountDetailSheet } from "@/components/finances/account-detail-sheet";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Landmark,
  Search,
  Plus,
  RefreshCw,
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
  Eye,
  Loader2,
  AlertCircle,
  MoreVertical,
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
  // Delay de 400ms para evitar consultas continuas al escribir
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modales y Show Sheet
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingAccount, setAdjustingAccount] = useState<FinancialAccount | null>(null);

  const [isTxOpen, setIsTxOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Consulta de Cuentas Financieras con debouncedSearch
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["financial-accounts", page, debouncedSearch, selectedType, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (debouncedSearch) params.append("search", debouncedSearch);
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
      queryClient.invalidateQueries({ queryKey: ["financial-account-detail"] });
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
      toast.success("Cuenta eliminada exitosamente");
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al eliminar la cuenta");
    },
  });

  // Métricas de Saldo
  const totalInUsd = accounts
    .filter((a) => a.currency?.code === "USD")
    .reduce((acc, curr) => acc + Number(curr.currentBalance || 0), 0);

  const totalInVes = accounts
    .filter((a) => a.currency?.code === "VES")
    .reduce((acc, curr) => acc + Number(curr.currentBalance || 0), 0);

  const banksCount = accounts.filter(
    (a) => a.type === "DOMESTIC_BANK" || a.type === "INTERNATIONAL_BANK"
  ).length;

  const cashWalletsCount = accounts.filter(
    (a) => a.type === "DIGITAL_WALLET" || a.type === "CASH_REGISTER"
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
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de cuentas bancarias, billeteras digitales y cajas receptoras para transacciones y arqueos.
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
            variant="outline"
            size="sm"
            onClick={() => setIsTxOpen(true)}
            className="h-9 gap-1.5 border-dashed"
          >
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Movimiento Rápido</span>
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

      {/* KPI Cards Grid con espaciado amplio */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Fondos USD ($)
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
              ${totalInUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              En cuentas y billeteras en dólares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-blue-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Fondos VES (Bs.)
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Landmark className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight font-mono text-blue-600 dark:text-blue-400">
              Bs. {totalInVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              En bancos nacionales y cajas en Bolívares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bancos Operativos
            </CardTitle>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight">
              {banksCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Cuentas bancarias registradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs hover:border-purple-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cajas y Billeteras
            </CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight">
              {cashWalletsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Efectivo, Binance y billeteras digitales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Buscador con delay debounce */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, banco o titular..."
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

            {/* Filtro Tipo */}
            <div>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 shadow-2xs"
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9 shadow-2xs"
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
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-9"
                >
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Cuentas Financieras Integrada (sin scroll horizontal) */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cuenta / Entidad
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">
                    Tipo
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[170px]">
                    Titular / Identificador
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[180px]">
                    Métodos Habilitados
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-[140px]">
                    Saldo Actual
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-[90px]">
                    Estado
                  </TableHead>
                  <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-[50px]">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/60">
                      <TableCell colSpan={7} className="py-5 px-5 text-center">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-muted/60 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="text-sm font-semibold text-foreground">
                          Error al cargar cuentas y cajas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(error as Error)?.message || "Ocurrió un error al obtener la lista de cuentas financieras."}
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
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <Landmark className="h-9 w-9 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">
                          No se encontraron cuentas financieras
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Crea tu primera cuenta bancaria o caja receptora para habilitar cobros en el punto de venta y control de tesorería.
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
                      <TableRow
                        key={acc.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/60"
                        onClick={() => {
                          setSelectedAccount(acc);
                          setIsDetailOpen(true);
                        }}
                      >
                        {/* Nombre y Entidad */}
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 shadow-2xs">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-foreground block truncate hover:text-primary transition-colors">
                                {acc.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                                {acc.bankName && <span className="font-medium text-foreground">{acc.bankName}</span>}
                                {acc.accountNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[11px]">
                                      {acc.accountNumber}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${typeConfig.badgeClass}`}
                          >
                            {typeConfig.label}
                          </span>
                        </TableCell>

                        {/* Titular e Identificador */}
                        <TableCell className="py-3.5 px-3">
                          {acc.holderName ? (
                            <div className="text-xs space-y-0.5">
                              <span className="text-foreground font-medium block truncate max-w-[160px]">
                                {acc.holderName}
                              </span>
                              {acc.identifier && (
                                <span className="text-[11px] font-mono text-muted-foreground block truncate max-w-[160px]">
                                  {acc.identifier}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">
                              No especificado
                            </span>
                          )}
                        </TableCell>

                        {/* Métodos de Pago */}
                        <TableCell className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
                            {acc.paymentMethods && acc.paymentMethods.length > 0 ? (
                              <>
                                {acc.paymentMethods
                                  .filter((pm) => pm.isActive)
                                  .slice(0, 2)
                                  .map((pm) => (
                                    <Badge
                                      key={pm.id}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 font-normal bg-background/80 whitespace-nowrap"
                                    >
                                      {pm.paymentMethod.name}
                                    </Badge>
                                  ))}
                                {acc.paymentMethods.filter((pm) => pm.isActive).length > 2 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-normal"
                                    title={acc.paymentMethods
                                      .filter((pm) => pm.isActive)
                                      .map((pm) => pm.paymentMethod.name)
                                      .join(", ")}
                                  >
                                    +{acc.paymentMethods.filter((pm) => pm.isActive).length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Todos permitidos
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Saldo Actual */}
                        <TableCell className="py-3.5 px-3 text-right">
                          <div className="font-mono text-sm font-bold text-foreground whitespace-nowrap">
                            {symbol} {balance.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {acc.currency?.code || "USD"}
                          </span>
                        </TableCell>

                        {/* Estado */}
                        <TableCell className="py-3.5 px-3 text-center">
                          <Badge
                            variant={acc.isActive ? "default" : "secondary"}
                            className="text-[10px] font-medium px-2 py-0.5 whitespace-nowrap"
                          >
                            {acc.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>

                        {/* Acciones Colapsadas en Menú de Tres Puntos */}
                        <TableCell className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  title="Opciones de cuenta"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Acciones de Cuenta</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAccount(acc);
                                  setIsDetailOpen(true);
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                                <span>Ver Detalle y Movimientos</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setAdjustingAccount(acc);
                                  setIsAdjustOpen(true);
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Scale className="h-4 w-4 text-amber-500" />
                                <span>Ajustar Saldo / Arqueo</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingAccount(acc);
                                  setIsFormOpen(true);
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 text-blue-500" />
                                <span>Editar Cuenta</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate(acc.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Power className="h-4 w-4 text-muted-foreground" />
                                <span>{acc.isActive ? "Desactivar Cuenta" : "Activar Cuenta"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => {
                                  setAccountToDelete(acc);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Eliminar Cuenta</span>
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

          {/* Paginación con espaciado amplio */}
          {!isLoading && accounts.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <span className="text-xs text-muted-foreground">
                Página {meta.page} de {meta.totalPages} ({meta.total} cuentas totales)
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

      {/* Show: Detalle Completo de Cuenta y Movimientos Internos */}
      <AccountDetailSheet
        account={selectedAccount}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onAdjust={(acc) => {
          setAdjustingAccount(acc);
          setIsAdjustOpen(true);
        }}
        onEdit={(acc) => {
          setEditingAccount(acc);
          setIsFormOpen(true);
        }}
        onNewTransaction={() => {
          setIsDetailOpen(false);
          setIsTxOpen(true);
        }}
      />

      {/* Modales Existentes */}
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
        <DialogContent className="sm:max-w-md p-6">
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
