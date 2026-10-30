"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  ShoppingCart,
  Package,
  Tv,
  CreditCard,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  sku: string;
  baseSalePrice: number | string;
  minStockAlert: number | string;
}

interface StreamingAccount {
  id: string;
  accessEmail: string;
  status: string;
  occupiedProfiles: number;
  profileCapacity: number;
  supplierCutoffDate: string;
  service?: {
    name: string;
  };
}

interface Sale {
  id: string;
  documentNumber?: string;
  orderNumber?: string;
  total: number | string;
  status: string;
  createdAt: string;
  customer?: {
    name: string;
    lastName?: string;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Queries con TanStack Query
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-summary"],
    queryFn: () => api.get<Product[]>("/products").catch(() => []),
  });

  const { data: streamingData, isLoading: loadingStreaming } = useQuery({
    queryKey: ["streaming-summary"],
    queryFn: () => api.get<StreamingAccount[]>("/streaming-accounts").catch(() => []),
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["sales-summary"],
    queryFn: () => api.get<Sale[]>("/sales").catch(() => []),
  });

  const products = Array.isArray(productsData) ? productsData : [];
  const streamingAccounts = Array.isArray(streamingData) ? streamingData : [];
  const sales = Array.isArray(salesData) ? salesData : [];

  // Métricas calculadas
  const totalSalesAmount = sales.reduce(
    (acc, curr) => acc + Number(curr.total || 0),
    0
  );

  const totalProfilesOccupied = streamingAccounts.reduce(
    (acc, curr) => acc + (curr.occupiedProfiles || 0),
    0
  );

  const totalProfilesCapacity = streamingAccounts.reduce(
    (acc, curr) => acc + (curr.profileCapacity || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              ¡Hola, {user?.name || "Administrador"}!
            </h2>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Este es el balance general de operaciones, inventario y cuentas streaming de hoy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/sales">
            <Button className="h-9 gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Nueva Venta</span>
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="h-9 gap-1.5">
              <Package className="h-4 w-4" />
              <span>Nuevo Producto</span>
            </Button>
          </Link>
          <Link href="/streaming">
            <Button variant="secondary" className="h-9 gap-1.5">
              <Tv className="h-4 w-4" />
              <span>Cuentas Streaming</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Registradas */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Totales
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {loadingSales ? "..." : `$${totalSalesAmount.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>{sales.length} transacciones registradas</span>
            </p>
          </CardContent>
        </Card>

        {/* Pantallas Streaming Ocupadas */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pantallas / Perfiles
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Tv className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {loadingStreaming
                ? "..."
                : `${totalProfilesOccupied} / ${totalProfilesCapacity}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{streamingAccounts.length} cuentas maestras activas</span>
            </p>
          </CardContent>
        </Card>

        {/* Productos en Catálogo */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Catálogo de Productos
            </CardTitle>
            <div className="rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {loadingProducts ? "..." : products.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Items y servicios configurados</span>
            </p>
          </CardContent>
        </Card>

        {/* Suscripciones Activas */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuentas por Renovar
            </CardTitle>
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {streamingAccounts.filter((a) => a.status === "AVAILABLE").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>Cuentas con cupo disponible</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Cuentas Streaming + Actividad Reciente */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Streaming Accounts Status (4 cols) */}
        <Card className="lg:col-span-4 border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Estado de Cuentas Streaming
              </CardTitle>
              <CardDescription>
                Capacidad de perfiles y vencimientos con proveedores
              </CardDescription>
            </div>
            <Link href="/streaming">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <span>Ver todas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingStreaming ? (
              <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
                Cargando cuentas...
              </div>
            ) : streamingAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                <Tv className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  No hay cuentas de streaming registradas aún
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Registra cuentas maestras de Netflix, Spotify, Disney+, etc. para comenzar a asignar perfiles.
                </p>
                <Link href="/streaming" className="mt-4">
                  <Button size="sm" variant="outline">
                    Registrar Cuenta
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Servicio / Correo</TableHead>
                      <TableHead>Perfiles</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Corte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {streamingAccounts.slice(0, 5).map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">
                              {acc.service?.name || "Servicio Streaming"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {acc.accessEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium">
                              {acc.occupiedProfiles}/{acc.profileCapacity}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              ({acc.profileCapacity - acc.occupiedProfiles} libres)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              acc.status === "AVAILABLE"
                                ? "secondary"
                                : acc.status === "FULL"
                                  ? "outline"
                                  : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {acc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(acc.supplierCutoffDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick ERP Shortcuts & System Info (3 cols) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Accesos directos a módulos */}
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Módulos Rápidos
              </CardTitle>
              <CardDescription>
                Accede rápidamente a las secciones principales
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link
                href="/sales"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">
                      Punto de Venta / Facturación
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Registrar salidas, cotizaciones y cobros multimoneda
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/subscriptions"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">
                      Suscripciones de Clientes
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Control de fechas de corte y recordatorios WhatsApp
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                href="/products"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">
                      Inventario & Precios
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Costo promedio, precio mayorista y alertas de stock
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
