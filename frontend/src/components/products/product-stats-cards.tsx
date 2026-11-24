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

  const criticalCount = products.filter((p) => {
    const totalQty = (p.inventories || []).reduce(
      (acc, inv) => acc + Number(inv.currentQuantity || 0),
      0
    );
    const minAlert = Number(p.minStockAlert || 0);
    return totalQty <= 0 || (minAlert > 0 && totalQty <= minAlert);
  }).length;

  const totalValueUSD = products.reduce((acc, p) => {
    const totalQty = (p.inventories || []).reduce(
      (invAcc, inv) => invAcc + Number(inv.currentQuantity || 0),
      0
    );
    return acc + totalQty * Number(p.averageCost || 0);
  }, 0);

  const totalValueBs = (totalValueUSD * exchangeRate).toFixed(2);

  const categoriesCount = new Set(
    products.map((p) => p.categoryId).filter(Boolean)
  ).size;

  const stats = [
    {
      title: "Total de productos",
      value: total,
      description: "Artículos registrados",
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Pocas existencias",
      value: criticalCount,
      description:
        criticalCount === 0
          ? "Todo con buen stock"
          : `${criticalCount} con stock bajo o agotado`,
      icon: AlertTriangle,
      color:
        criticalCount > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      bg: criticalCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
    },
    {
      title: "Valor en mercancía",
      value: `$${totalValueUSD.toFixed(2)}`,
      description: `Bs. ${totalValueBs} al costo`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Categorías",
      value: categoriesCount,
      description: "Con productos registrados",
      icon: Layers,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="shadow-2xs border-border p-5 gap-0 rounded-xl"
          >
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-2.5">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-xl p-2 ${stat.bg} ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
