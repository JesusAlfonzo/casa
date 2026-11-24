"use client";

import React from "react";
import { type SaleStats } from "@/types/pos";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesStatsCardsProps {
  stats: SaleStats | null;
  isLoading: boolean;
}

export function SalesStatsCards({ stats, isLoading }: SalesStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="animate-pulse rounded-xl border border-border p-5 bg-card shadow-2xs"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-9 w-9 bg-muted rounded-xl" />
            </div>
            <div className="h-8 w-28 bg-muted rounded mb-2" />
            <div className="h-3.5 w-36 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Ventas de hoy */}
      <Card className="rounded-xl border border-border shadow-2xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ventas de hoy
          </CardTitle>
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-3xl font-bold font-mono tracking-tight text-foreground leading-none">
            ${Number(stats.salesTodayAmount || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.salesTodayCount || 0}{" "}
            {(stats.salesTodayCount || 0) === 1
              ? "venta hecha hoy"
              : "ventas hechas hoy"}
          </p>
        </CardContent>
      </Card>

      {/* Total vendido */}
      <Card className="rounded-xl border border-border shadow-2xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total vendido
          </CardTitle>
          <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-3xl font-bold font-mono tracking-tight text-foreground leading-none">
            ${Number(stats.totalInvoiced || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Suma de todas las ventas
          </p>
        </CardContent>
      </Card>

      {/* Dinero cobrado */}
      <Card className="rounded-xl border border-border shadow-2xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Dinero cobrado
          </CardTitle>
          <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            ${Number(stats.totalCollected || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Ya recibido en caja o cuentas
          </p>
        </CardContent>
      </Card>

      {/* Por cobrar (fiado) */}
      <Card className="rounded-xl border border-border shadow-2xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Por cobrar (fiado)
          </CardTitle>
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 leading-none">
            ${Number(stats.totalPendingBalance || 0).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {stats.pendingSales || 0}{" "}
            {(stats.pendingSales || 0) === 1
              ? "venta pendiente"
              : "ventas pendientes"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
