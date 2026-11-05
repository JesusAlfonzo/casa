"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Purchase,
  type Supplier,
  type Product,
  type LocationWarehouse,
} from "@/types/inventory";
import { type Currency } from "@/types/pos";
import { CreatePurchaseModal } from "@/components/purchases/create-purchase-modal";
import { ReceivePurchaseModal } from "@/components/purchases/receive-purchase-modal";
import { PurchaseDetailSheet } from "@/components/purchases/purchase-detail-sheet";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  PackageCheck,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Eye,
  XCircle,
  Truck,
  Building,
  DollarSign,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchaseForDetail, setSelectedPurchaseForDetail] = useState<Purchase | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPurchaseForReceive, setSelectedPurchaseForReceive] = useState<Purchase | null>(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null);

  // Queries: Suppliers
  const { data: suppliersRes } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: Supplier[]; items?: Supplier[] } | Supplier[]>(
        "/suppliers?limit=100"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  // Queries: Products
  const { data: productsRes } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: Product[]; items?: Product[] } | Product[]>(
        "/products?limit=200"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  // Queries: Locations
  const { data: locationsRes } = useQuery({
    queryKey: ["locations-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: LocationWarehouse[]; items?: LocationWarehouse[] } | LocationWarehouse[]>(
        "/locations?limit=50"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  // Queries: Currencies
  const { data: currenciesRes } = useQuery({
    queryKey: ["currencies-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: Currency[]; items?: Currency[] } | Currency[]>(
        "/currencies"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  // Queries: Exchange Rate
  const { data: exchangeRateData } = useQuery({
    queryKey: ["current-exchange-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate: number | string }>("/exchange-rates/current");
        return Number(res?.rate || 1);
      } catch {
        return 50.0;
      }
    },
  });

  // Queries: Purchases list
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim());
  if (statusFilter !== "ALL") params.set("status", statusFilter);

  const {
    data: purchasesRes,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["purchases-list", page, debouncedSearchTerm, statusFilter],
    queryFn: async () => {
      const res = await api.get<{
        data?: Purchase[];
        items?: Purchase[];
        meta?: { total: number; totalPages: number };
        total?: number;
        totalPages?: number;
      } | Purchase[]>(`/purchases?${params.toString()}`);

      if (Array.isArray(res)) {
        return { data: res, total: res.length, totalPages: 1 };
      }
      const data = res.data || res.items || [];
      const total = res.meta?.total ?? res.total ?? data.length;
      const totalPages = res.meta?.totalPages ?? res.totalPages ?? 1;
      return { data, total, totalPages };
    },
  });

  const exchangeRate = exchangeRateData || 50.0;
  const purchases = purchasesRes?.data || [];
  const total = purchasesRes?.total || 0;
  const totalPages = purchasesRes?.totalPages || 1;

  const suppliers = suppliersRes || [];
  const products = productsRes || [];
  const locations = locationsRes || [];
  const currencies = currenciesRes || [];

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/purchases/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases-list"] });
      setCancelTarget(null);
    },
  });

  // Calculate KPIs
  const totalInvoicedUSD = purchases.reduce(
    (acc, p) => (p.status !== "CANCELLED" ? acc + Number(p.total || 0) : acc),
    0
  );
  const totalInvoicedBs = (totalInvoicedUSD * exchangeRate).toFixed(2);
  const pendingReceiveCount = purchases.filter(
    (p) => p.status === "PENDING" || p.status === "ORDERED" || p.status === "PARTIALLY_RECEIVED"
  ).length;
  const fullyReceivedCount = purchases.filter((p) => p.status === "RECEIVED").length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            Recibida 100%
          </Badge>
        );
      case "PARTIALLY_RECEIVED":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            Parcial
          </Badge>
        );
      case "PENDING":
      case "ORDERED":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            Pendiente
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelada
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            Pagada
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            Pago Parcial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const handleOpenReceive = (p: Purchase) => {
    setSelectedPurchaseForReceive(p);
    setIsReceiveOpen(true);
  };

  const handleOpenDetail = (p: Purchase) => {
    setSelectedPurchaseForDetail(p);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Compras a Proveedores
            </h1>
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Abastecimiento & Stock
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de pedidos de abastecimiento, costo promedio y recepción de mercancía física en almacén.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Nueva Orden de Compra
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Compras
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold">{total}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Órdenes de abastecimiento registradas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes de Recepción
            </CardTitle>
            <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingReceiveCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mercancía por ingresar al almacén
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recibidas al 100%
            </CardTitle>
            <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fullyReceivedCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingresadas a stock y disponibles para venta
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Facturado (USD)
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-mono">
              ${totalInvoicedUSD.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Aprox. Bs. {totalInvoicedBs}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table Card with Filters */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por N° orden, factura o proveedor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 text-xs"
              />
              {(searchTerm !== debouncedSearchTerm || isFetching) && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={statusFilter === "ALL" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("ALL");
                  setPage(1);
                }}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("PENDING");
                  setPage(1);
                }}
              >
                Pendientes
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "PARTIALLY_RECEIVED" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("PARTIALLY_RECEIVED");
                  setPage(1);
                }}
              >
                Parciales
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "RECEIVED" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("RECEIVED");
                  setPage(1);
                }}
              >
                Recibidas
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="w-full overflow-hidden">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    N° Orden / Factura
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Proveedor
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Total ($)
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Artículos
                  </TableHead>
                  <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Estado
                  </TableHead>
                  <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Cargando órdenes de compra...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          No se encontraron órdenes de compra
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {debouncedSearchTerm
                            ? "Prueba modificando el término de búsqueda o filtro de estado."
                            : "Registra una compra a proveedor para ingresar existencias al stock."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => {
                    const totalUSD = Number(purchase.total || 0);
                    const canReceive =
                      purchase.status !== "RECEIVED" && purchase.status !== "CANCELLED";

                    return (
                      <TableRow
                        key={purchase.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {purchase.orderNumber}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                              {purchase.supplierInvoiceNumber
                                ? `Fac: ${purchase.supplierInvoiceNumber}`
                                : "Sin N° Factura"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">
                              {purchase.supplier?.legalName || "Proveedor"}
                            </span>
                            {purchase.supplier?.tradeName && (
                              <span className="text-[11px] text-muted-foreground">
                                {purchase.supplier.tradeName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-xs font-bold text-foreground">
                              ${totalUSD.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Bs. {(totalUSD * exchangeRate).toFixed(2)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          <Badge variant="outline" className="text-xs font-mono">
                            <Package className="mr-1 h-3 w-3" />
                            {purchase.items?.length || 0} ítems
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          {renderStatusBadge(purchase.status)}
                        </TableCell>

                        <TableCell className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canReceive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReceive(purchase)}
                                className="h-8 px-2.5 text-xs gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-medium"
                                title="Recibir mercancía en almacén"
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Recibir</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(purchase)}
                              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              title="Ver detalle de la orden"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span className="hidden sm:inline">Ver</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label="Más opciones"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDetail(purchase)}
                                  className="gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                  Ver Detalle de Orden
                                </DropdownMenuItem>

                                {canReceive && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenReceive(purchase)}
                                    className="gap-2 text-emerald-600 dark:text-emerald-400 font-medium"
                                  >
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    Recibir Mercancía
                                  </DropdownMenuItem>
                                )}

                                {purchase.status !== "CANCELLED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setCancelTarget(purchase)}
                                      className="gap-2 text-destructive focus:text-destructive"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancelar Orden
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages || 1} ({total} órdenes)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-8 text-xs"
                >
                  Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Purchase Modal */}
      <CreatePurchaseModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        suppliers={suppliers}
        products={products}
        locations={locations}
        currencies={currencies}
      />

      {/* Receive Purchase Modal */}
      <ReceivePurchaseModal
        open={isReceiveOpen}
        onOpenChange={setIsReceiveOpen}
        purchase={selectedPurchaseForReceive}
        locations={locations}
      />

      {/* Purchase Detail Sheet */}
      <PurchaseDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        purchase={selectedPurchaseForDetail}
        onReceiveItems={(p) => {
          setIsDetailOpen(false);
          handleOpenReceive(p);
        }}
        exchangeRate={exchangeRate}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Cancelar orden de compra?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de cancelar la orden de compra{" "}
                <strong className="text-foreground">{cancelTarget?.orderNumber}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Esta acción no se puede deshacer. Los ítems no recibidos serán descartados del flujo de abastecimiento.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
