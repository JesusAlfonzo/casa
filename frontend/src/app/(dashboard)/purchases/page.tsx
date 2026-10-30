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
  if (searchTerm.trim()) params.set("search", searchTerm.trim());
  if (statusFilter !== "ALL") params.set("status", statusFilter);

  const {
    data: purchasesRes,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["purchases-list", page, searchTerm, statusFilter],
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
    (p) => p.status === "ORDERED" || p.status === "PARTIALLY_RECEIVED"
  ).length;
  const fullyReceivedCount = purchases.filter((p) => p.status === "RECEIVED").length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
            Recibida 100%
          </Badge>
        );
      case "PARTIALLY_RECEIVED":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs font-semibold">
            Parcial
          </Badge>
        );
      case "ORDERED":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-xs font-semibold">
            Ordenada
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelada
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Compras a Proveedores
            </h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Abastecimiento
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
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
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invertido
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ${totalInvoicedUSD.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bs. {totalInvoicedBs}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes por Recibir
            </CardTitle>
            <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReceiveCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Órdenes en tránsito o parciales
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Órdenes Recibidas
            </CardTitle>
            <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
              <PackageCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullyReceivedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingresadas 100% al stock
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Proveedores
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              En directorio de compras
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por N° orden, factura o proveedor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
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
                variant={statusFilter === "ORDERED" ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => {
                  setStatusFilter("ORDERED");
                  setPage(1);
                }}
              >
                Ordenadas
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

        <CardContent className="p-4 pt-2">
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">N° Orden</TableHead>
                  <TableHead>Factura Prov.</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total ($)</TableHead>
                  <TableHead className="text-center">Artículos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs text-muted-foreground">
                          Cargando órdenes de compra...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          No se encontraron órdenes de compra
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Registra un pedido a proveedor para ingresar existencias al stock.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => {
                    const totalUSD = Number(purchase.total || 0);
                    const canReceive =
                      purchase.status === "ORDERED" ||
                      purchase.status === "PARTIALLY_RECEIVED";

                    return (
                      <TableRow
                        key={purchase.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleOpenDetail(purchase)}
                      >
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {purchase.orderNumber}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {purchase.supplierInvoiceNumber || "-"}
                        </TableCell>

                        <TableCell>
                          <span className="font-semibold text-xs text-foreground">
                            {purchase.supplier?.legalName || "Proveedor"}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          ${totalUSD.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs font-mono">
                            <Package className="mr-1 h-3 w-3" />
                            {purchase.items?.length || purchase._count?.items || 0}
                          </Badge>
                        </TableCell>

                        <TableCell>{renderStatusBadge(purchase.status)}</TableCell>

                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  aria-label="Opciones de orden"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">
                                Acciones
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenDetail(purchase)}
                                className="text-xs gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Detalle de Orden
                              </DropdownMenuItem>
                              {canReceive && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenReceive(purchase)}
                                  className="text-xs gap-2 text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  <PackageCheck className="h-4 w-4" />
                                  Recibir Mercancía
                                </DropdownMenuItem>
                              )}
                              {purchase.status !== "CANCELLED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setCancelTarget(purchase)}
                                    className="text-xs gap-2 text-destructive focus:text-destructive"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Cancelar Orden
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-2 py-3 text-xs text-muted-foreground mt-2">
            <span>
              Total órdenes: <strong>{total}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span>
                Página {page} de {totalPages || 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
        purchase={selectedPurchaseForDetail}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onReceiveItems={(p) => {
          setIsDetailOpen(false);
          handleOpenReceive(p);
        }}
        exchangeRate={exchangeRate}
      />

      {/* Cancel Order Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Cancelar orden de compra?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de anular la orden{" "}
                <strong>{cancelTarget?.orderNumber}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Si la orden ya tenía unidades recibidas, los movimientos de inventario no se
                revertirán automáticamente; deberás realizar un ajuste manual si aplica.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Anulación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
