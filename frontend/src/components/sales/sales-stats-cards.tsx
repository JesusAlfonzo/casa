"use client";

import React from "react";
import { type SaleStats } from "@/types/pos";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesStatsCardsProps {
  stats: SaleStats | null;
  isLoading: boolean;
}

export function SalesStatsCards({ stats, isLoading }: SalesStatsCardsProps) {
  if (isLoading || !stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Ventas Hoy */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Ventas de Hoy
          </CardTitle>
          <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-lg font-bold">
            ${Number(stats.salesTodayAmount || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.salesTodayCount || 0} comprobantes emitidos hoy
          </p>
        </CardContent>
      </Card>

      {/* Total Facturado */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Total Facturado
          </CardTitle>
          <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-lg font-bold">
            ${Number(stats.totalInvoiced || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Total histórico facturado
          </p>
        </CardContent>
      </Card>

      {/* Total Recaudado / Cobrado */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Total Recaudado
          </CardTitle>
          <div className="rounded-md bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
            <ShoppingCart className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-lg font-bold">
            ${Number(stats.totalCollected || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ingresado en bancos y cajas
          </p>
        </CardContent>
      </Card>

      {/* Saldo Pendiente por Cobrar */}
      <Card className="border-border shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Cuentas por Cobrar
          </CardTitle>
          <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            ${Number(stats.totalPendingBalance || 0).toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.pendingSales || 0} ventas a crédito / pendientes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
