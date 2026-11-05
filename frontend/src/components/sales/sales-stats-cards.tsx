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
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse rounded-xl border border-border/80 px-4.5 py-3.5 bg-card shadow-xs">
            <div className="flex justify-between items-center mb-2">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-8 w-8 bg-muted rounded-xl" />
            </div>
            <div className="h-8 w-28 bg-muted rounded mb-1.5" />
            <div className="h-3 w-36 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* Ventas Hoy */}
      <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
        <CardHeader className="flex flex-row items-center justify-between px-4.5 pt-3.5 pb-1 sm:px-5 sm:pt-4 sm:pb-1">
          <CardTitle className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-muted-foreground">
            Ventas de Hoy
          </CardTitle>
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4.5 pb-3.5 pt-0 sm:px-5 sm:pb-4">
          <div className="text-2xl sm:text-3xl xl:text-[32px] font-black font-mono tracking-tight text-foreground leading-none">
            ${Number(stats.salesTodayAmount || 0).toFixed(2)}
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-1.5">
            {stats.salesTodayCount || 0} comprobantes emitidos hoy
          </p>
        </CardContent>
      </Card>

      {/* Total Facturado */}
      <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
        <CardHeader className="flex flex-row items-center justify-between px-4.5 pt-3.5 pb-1 sm:px-5 sm:pt-4 sm:pb-1">
          <CardTitle className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-muted-foreground">
            Total Facturado
          </CardTitle>
          <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4.5 pb-3.5 pt-0 sm:px-5 sm:pb-4">
          <div className="text-2xl sm:text-3xl xl:text-[32px] font-black font-mono tracking-tight text-foreground leading-none">
            ${Number(stats.totalInvoiced || 0).toFixed(2)}
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-1.5">
            Total histórico facturado
          </p>
        </CardContent>
      </Card>

      {/* Total Recaudado */}
      <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
        <CardHeader className="flex flex-row items-center justify-between px-4.5 pt-3.5 pb-1 sm:px-5 sm:pt-4 sm:pb-1">
          <CardTitle className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-muted-foreground">
            Total Recaudado
          </CardTitle>
          <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4.5 pb-3.5 pt-0 sm:px-5 sm:pb-4">
          <div className="text-2xl sm:text-3xl xl:text-[32px] font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            ${Number(stats.totalCollected || 0).toFixed(2)}
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-1.5">
            Ingresado en bancos y cajas
          </p>
        </CardContent>
      </Card>

      {/* Saldo Pendiente por Cobrar */}
      <Card className="rounded-xl border border-border/80 shadow-xs bg-card hover:border-border transition-all">
        <CardHeader className="flex flex-row items-center justify-between px-4.5 pt-3.5 pb-1 sm:px-5 sm:pt-4 sm:pb-1">
          <CardTitle className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-muted-foreground">
            Cuentas por Cobrar
          </CardTitle>
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4.5 pb-3.5 pt-0 sm:px-5 sm:pb-4">
          <div className="text-2xl sm:text-3xl xl:text-[32px] font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 leading-none">
            ${Number(stats.totalPendingBalance || 0).toFixed(2)}
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-1.5">
            {stats.pendingSales || 0} ventas a crédito o pendientes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
