"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type FinancialAccount,
  type FinancialAccountType,
  type PaymentTransaction,
} from "@/types/finance";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Landmark,
  Wallet,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Edit,
  Clock,
  Loader2,
  Receipt,
  User,
  CreditCard,
  Hash,
  AlertTriangle,
  RefreshCw,
  Plus,
} from "lucide-react";

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

interface AccountDetailSheetProps {
  account: FinancialAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjust?: (account: FinancialAccount) => void;
  onEdit?: (account: FinancialAccount) => void;
  onNewTransaction?: () => void;
}

export function AccountDetailSheet({
  account,
  open,
  onOpenChange,
  onAdjust,
  onEdit,
  onNewTransaction,
}: AccountDetailSheetProps) {
  const [filterFlow, setFilterFlow] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");

  // Fetch account full detail
  const { data: detailData } = useQuery<{
    success: boolean;
    data: FinancialAccount;
  }>({
    queryKey: ["financial-account-detail", account?.id],
    queryFn: () => api.get(`/financial-accounts/${account?.id}`),
    enabled: !!account?.id && open,
  });

  // Fetch transactions of this financial account
  const {
    data: txData,
    isLoading: loadingTx,
    isError: errorTx,
    refetch: refetchTx,
  } = useQuery<{
    success: boolean;
    data: PaymentTransaction[];
    meta?: { total: number };
  } | PaymentTransaction[]>({
    queryKey: ["account-transactions", account?.id, filterFlow],
    queryFn: () => {
      const params = new URLSearchParams();
      if (account?.id) params.append("financialAccountId", account.id);
      params.append("limit", "50");
      if (filterFlow !== "ALL") params.append("flowType", filterFlow);
      return api.get(`/payment-transactions?${params.toString()}`);
    },
    enabled: !!account?.id && open,
  });

  const currentAccount = detailData?.data || account;
  const transactions: PaymentTransaction[] = Array.isArray(txData)
    ? txData
    : Array.isArray((txData as { data?: PaymentTransaction[] })?.data)
      ? (txData as { data: PaymentTransaction[] }).data
      : [];

  const symbol = currentAccount?.currency?.symbol || "$";
  const balance = Number(currentAccount?.currentBalance || 0);

  const typeInfo = currentAccount?.type
    ? TYPE_CONFIG[currentAccount.type]
    : { label: "Cuenta", badgeClass: "", icon: Landmark };
  const TypeIcon = typeInfo.icon;

  if (!currentAccount) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0">
        {/* Header con espaciado amplio */}
        <SheetHeader className="text-left px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
                <TypeIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
                  {currentAccount.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {currentAccount.bankName
                    ? `${currentAccount.bankName} • ${typeInfo.label}`
                    : typeInfo.label}
                </SheetDescription>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={`text-[11px] font-medium ${typeInfo.badgeClass}`}>
                {typeInfo.label}
              </Badge>
              <Badge
                variant={currentAccount.isActive ? "default" : "secondary"}
                className="text-[11px] font-medium"
              >
                {currentAccount.isActive ? "ACTIVA" : "INACTIVA"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6 text-xs">
          {/* Card Saldo Destacado y Acciones Rápidas */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">
                  Saldo Contable Disponible
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
                    {symbol} {balance.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    {currentAccount.currency?.code || "USD"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdjust?.(currentAccount)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Scale className="h-3.5 w-3.5 text-amber-500" />
                  <span>Ajustar Saldo</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(currentAccount)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5 text-blue-500" />
                  <span>Editar</span>
                </Button>

                {onNewTransaction && (
                  <Button
                    size="sm"
                    onClick={onNewTransaction}
                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Movimiento</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Datos Bancarios y Titular */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-border/60 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Hash className="h-3.5 w-3.5 text-primary" /> N° de Cuenta / IBAN:
                </span>
                <p className="font-mono text-xs font-semibold text-foreground truncate">
                  {currentAccount.accountNumber || "No aplica (Caja física)"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <User className="h-3.5 w-3.5 text-primary" /> Titular Registrado:
                </span>
                <p className="font-medium text-xs text-foreground truncate">
                  {currentAccount.holderName || "No registrado"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Receipt className="h-3.5 w-3.5 text-primary" /> RIF / Identificador:
                </span>
                <p className="font-mono text-xs font-semibold text-foreground truncate">
                  {currentAccount.identifier || "No registrado"}
                </p>
              </div>
            </div>
          </div>

          {/* Métodos de Pago Habilitados */}
          <div className="space-y-2.5">
            <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">
              Métodos de Pago Habilitados
            </span>
            <div className="flex flex-wrap gap-2">
              {currentAccount.paymentMethods && currentAccount.paymentMethods.length > 0 ? (
                currentAccount.paymentMethods
                  .filter((pm) => pm.isActive)
                  .map((pm) => (
                    <Badge
                      key={pm.id}
                      variant="outline"
                      className="text-xs px-2.5 py-1 font-medium bg-muted/40 border-border/80 flex items-center gap-1.5"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span>{pm.paymentMethod.name}</span>
                    </Badge>
                  ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Todos los métodos de pago están permitidos en esta cuenta.
                </span>
              )}
            </div>
          </div>

          {/* Movimientos y Transacciones Internas */}
          <div className="space-y-3.5 pt-3 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-foreground text-sm block">
                  Movimientos Internos y Transacciones
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Ingresos, egresos y arqueos asentados en esta cuenta.
                </p>
              </div>

              {/* Filtro de flujo */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border/60">
                <button
                  type="button"
                  onClick={() => setFilterFlow("ALL")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    filterFlow === "ALL"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterFlow("INFLOW")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    filterFlow === "INFLOW"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ingresos (+)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterFlow("OUTFLOW")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    filterFlow === "OUTFLOW"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Egresos (-)
                </button>
              </div>
            </div>

            {loadingTx ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Cargando movimientos de la cuenta...</span>
              </div>
            ) : errorTx ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-2">
                <AlertTriangle className="h-7 w-7 text-destructive mx-auto" />
                <p className="text-xs font-semibold text-destructive">
                  Error al cargar los movimientos
                </p>
                <p className="text-[11px] text-muted-foreground">
                  No se pudieron obtener las transacciones de esta cuenta financiera.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchTx()}
                  className="h-8 text-xs mt-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reintentar
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                <Receipt className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  Sin movimientos registrados
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Esta cuenta aún no posee transacciones de cobros, compras o ajustes de saldo.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {transactions.map((tx) => {
                  const isInflow = tx.flowType === "INFLOW";
                  const txAmount = Number(tx.amount || 0);
                  const txSymbol = tx.currency?.symbol || symbol;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-border/80 bg-card hover:bg-muted/20 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isInflow
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {isInflow ? "Ingreso / Cobro" : "Egreso / Pago"}
                            </span>
                            {tx.paymentMethod && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                                {tx.paymentMethod.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {tx.reference && (
                              <span className="font-mono">Ref: {tx.reference}</span>
                            )}
                            {tx.notes && (
                              <span className="truncate max-w-[200px]">
                                • {tx.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-sm font-bold ${
                            isInflow
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInflow ? "+" : "-"} {txSymbol} {txAmount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 font-mono mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(tx.paidAt || tx.createdAt).toLocaleDateString("es-VE")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
