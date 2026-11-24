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
      title: "Total de clientes",
      value: total,
      description: "Personas registradas",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Activos",
      value: activeCount,
      description: `${total > 0 ? Math.round((activeCount / total) * 100) : 0}% activos`,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Con streaming",
      value: withStreamingCount,
      description: "Tienen pantallas asignadas",
      icon: Tv,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Con compras",
      value: withSalesCount,
      description: "Han comprado productos o servicios",
      icon: ShoppingCart,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
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
              <div className="text-3xl font-bold tracking-tight text-foreground">
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
