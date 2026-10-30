"use client";

import React from "react";
import { type Product } from "@/types/inventory";
import { Package, AlertTriangle, DollarSign, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductStatsCardsProps {
  products: Product[];
  totalFromApi?: number;
  exchangeRate?: number;
}

export function ProductStatsCards({
  products,
  totalFromApi,
  exchangeRate = 1,
}: ProductStatsCardsProps) {
  const total = totalFromApi ?? products.length;

  // Calculate critical stock (where total stock in inventories <= minStockAlert)
  const criticalCount = products.filter((p) => {
    const totalQty = (p.inventories || []).reduce(
      (acc, inv) => acc + Number(inv.currentQuantity || 0),
      0
    );
    const minAlert = Number(p.minStockAlert || 0);
    return minAlert > 0 && totalQty <= minAlert;
  }).length;

  // Calculate total inventory value at cost
  const totalValueUSD = products.reduce((acc, p) => {
    const totalQty = (p.inventories || []).reduce(
      (invAcc, inv) => invAcc + Number(inv.currentQuantity || 0),
      0
    );
    return acc + totalQty * Number(p.averageCost || 0);
  }, 0);

  const totalValueBs = (totalValueUSD * exchangeRate).toFixed(2);

  // Distinct categories
  const categoriesCount = new Set(
    products.map((p) => p.categoryId).filter(Boolean)
  ).size;

  const stats = [
    {
      title: "Total Productos",
      value: total,
      description: "Artículos en catálogo activo",
      icon: Package,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Stock Crítico / Por Agotar",
      value: criticalCount,
      description: `${criticalCount} con existencias ≤ alerta mínima`,
      icon: AlertTriangle,
      color:
        criticalCount > 0
          ? "text-amber-500 dark:text-amber-400"
          : "text-emerald-500 dark:text-emerald-400",
      bg:
        criticalCount > 0
          ? "bg-amber-500/10"
          : "bg-emerald-500/10",
    },
    {
      title: "Valoración Inventario",
      value: `$${totalValueUSD.toFixed(2)}`,
      description: `Bs. ${totalValueBs} (al costo)`,
      icon: DollarSign,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Categorías Activas",
      value: categoriesCount,
      description: "Líneas de producto registradas",
      icon: Layers,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="shadow-xs border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
