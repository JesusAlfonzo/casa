"use client";

import React from "react";
import { type Customer } from "@/types/customer";
import { Users, UserCheck, Tv, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerStatsCardsProps {
  customers: Customer[];
  totalFromApi?: number;
}

export function CustomerStatsCards({
  customers,
  totalFromApi,
}: CustomerStatsCardsProps) {
  const total = totalFromApi ?? customers.length;
  const activeCount = customers.filter((c) => c.isActive).length;
  const withStreamingCount = customers.filter(
    (c) => (c._count?.subscriptions || 0) > 0
  ).length;
  const withSalesCount = customers.filter(
    (c) => (c._count?.sales || 0) > 0
  ).length;

  const stats = [
    {
      title: "Total Clientes",
      value: total,
      description: "Directorio general registrado",
      icon: Users,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Clientes Activos",
      value: activeCount,
      description: `${total > 0 ? Math.round((activeCount / total) * 100) : 0}% con estado activo`,
      icon: UserCheck,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Con Pantallas Streaming",
      value: withStreamingCount,
      description: "Suscripciones de perfiles asociadas",
      icon: Tv,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Clientes Recurrentes (Ventas)",
      value: withSalesCount,
      description: "Con compras y facturas en POS",
      icon: ShoppingCart,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
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
