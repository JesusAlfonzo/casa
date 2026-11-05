"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type Product,
  type LocationWarehouse,
  type InventoryMovement,
} from "@/types/inventory";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import { TransferStockModal } from "@/components/inventory/transfer-stock-modal";
import { LocationFormModal } from "@/components/inventory/location-form-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  Warehouse,
  History,
  SlidersHorizontal,
  ArrowLeftRight,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Package,
  Loader2,
  TrendingUp,
  AlertCircle,
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

interface InventoryStockRecord {
  id: string;
  productId: string;
  locationId: string;
  currentQuantity: number | string;
  reservedQuantity: number | string;
  specificLocation?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    minStockAlert: number | string;
    baseSalePrice: number | string;
    averageCost: number | string;
    measurementUnit?: {
      abbreviation: string;
    };
    category?: {
      name: string;
    };
  };
  location?: {
    id: string;
    code: string;
    name: string;
  };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"stock" | "movements" | "locations">("stock");

  // Stock filters with debounce
  const [searchStock, setSearchStock] = useState("");
  const debouncedSearchStock = useDebounce(searchStock, 400);
  const [filterLocation, setFilterLocation] = useState<string>("ALL");
  const [filterStockStatus, setFilterStockStatus] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK">("ALL");
  const [stockPage, setStockPage] = useState(1);
  const stockLimit = 15;

  // Movements filters with debounce
  const [searchMovement, setSearchMovement] = useState("");
  const debouncedSearchMovement = useDebounce(searchMovement, 400);
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("ALL");
  const [movementPage, setMovementPage] = useState(1);
  const movementLimit = 20;

  // Locations search & pagination
  const [searchLocation, setSearchLocation] = useState("");
  const debouncedSearchLocation = useDebounce(searchLocation, 400);
  const [locationPage, setLocationPage] = useState(1);
  const locationLimit = 10;

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<string>("");
  const [adjustTargetLocation, setAdjustTargetLocation] = useState<string>("");

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState<string>("");
  const [transferTargetLocation, setTransferTargetLocation] = useState<string>("");

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWarehouse | null>(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<LocationWarehouse | null>(null);

  // Queries: Locations
  const { data: locationsRes, isLoading: loadingLocations, refetch: refetchLocations } = useQuery({
    queryKey: ["locations-all"],
    queryFn: async () => {
      const res = await api.get<{ data?: LocationWarehouse[]; items?: LocationWarehouse[] } | LocationWarehouse[]>(
        "/locations?limit=50"
      );
      if (Array.isArray(res)) return res;
      return res.data || res.items || [];
    },
  });

  // Queries: Products list for modals
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

  // Queries: Inventory Stock
  const stockParams = new URLSearchParams();
  stockParams.set("page", String(stockPage));
  stockParams.set("limit", String(stockLimit));
  if (filterLocation !== "ALL") stockParams.set("locationId", filterLocation);
  if (filterStockStatus === "LOW_STOCK") stockParams.set("lowStock", "true");
  if (filterStockStatus === "IN_STOCK") stockParams.set("hasStock", "true");
  if (debouncedSearchStock.trim()) stockParams.set("search", debouncedSearchStock.trim());

  const {
    data: stockRes,
    isLoading: loadingStock,
    refetch: refetchStock,
    isFetching: fetchingStock,
  } = useQuery({
    queryKey: ["inventories-list", stockPage, filterLocation, filterStockStatus, debouncedSearchStock],
    queryFn: async () => {
      const res = await api.get<{
        data?: InventoryStockRecord[];
        items?: InventoryStockRecord[];
        meta?: { total: number; totalPages: number };
        total?: number;
        totalPages?: number;
      } | InventoryStockRecord[]>(`/inventories?${stockParams.toString()}`);

      if (Array.isArray(res)) {
        return { data: res, total: res.length, totalPages: 1 };
      }
      const data = res.data || res.items || [];
      const total = res.meta?.total ?? res.total ?? data.length;
      const totalPages = res.meta?.totalPages ?? res.totalPages ?? 1;
      return { data, total, totalPages };
    },
  });

  // Queries: Movements (Kardex)
  const movParams = new URLSearchParams();
  movParams.set("page", String(movementPage));
  movParams.set("limit", String(movementLimit));
  if (movementTypeFilter !== "ALL") movParams.set("movementType", movementTypeFilter);

  const {
    data: movementsRes,
    isLoading: loadingMovements,
    refetch: refetchMovements,
    isFetching: fetchingMovements,
  } = useQuery({
    queryKey: ["inventory-movements", movementPage, movementTypeFilter],
    queryFn: async () => {
      const res = await api.get<{
        data?: InventoryMovement[];
        items?: InventoryMovement[];
        meta?: { total: number; totalPages: number };
        total?: number;
        totalPages?: number;
      } | InventoryMovement[]>(`/inventories/movements?${movParams.toString()}`);

      if (Array.isArray(res)) {
        return { data: res, total: res.length, totalPages: 1 };
      }
      const data = res.data || res.items || [];
      const total = res.meta?.total ?? res.total ?? data.length;
      const totalPages = res.meta?.totalPages ?? res.totalPages ?? 1;
      return { data, total, totalPages };
    },
    enabled: activeTab === "movements",
  });

  const locations = locationsRes || [];
  const products = productsRes || [];
  const stockItems = stockRes?.data || [];
  const stockTotal = stockRes?.total || 0;
  const stockTotalPages = stockRes?.totalPages || 1;

  const rawMovements = movementsRes?.data || [];
  const filteredMovements = rawMovements.filter((mov) => {
    const term = debouncedSearchMovement.toLowerCase().trim();
    if (!term) return true;
    return (
      Boolean(mov.product?.name && mov.product.name.toLowerCase().includes(term)) ||
      Boolean(mov.product?.sku && mov.product.sku.toLowerCase().includes(term)) ||
      Boolean(mov.reason && mov.reason.toLowerCase().includes(term)) ||
      Boolean(mov.inventory?.location?.name && mov.inventory.location.name.toLowerCase().includes(term)) ||
      Boolean(mov.user?.name && mov.user.name.toLowerCase().includes(term))
    );
  });
  const movementsTotal = movementsRes?.total || 0;
  const movementsTotalPages = movementsRes?.totalPages || 1;

  // Locations filtering
  const filteredLocations = locations.filter((loc) => {
    const term = debouncedSearchLocation.toLowerCase().trim();
    if (!term) return true;
    return (
      Boolean(loc.name && loc.name.toLowerCase().includes(term)) ||
      Boolean(loc.code && loc.code.toLowerCase().includes(term)) ||
      Boolean(loc.address && loc.address.toLowerCase().includes(term))
    );
  });
  const locationTotalPages = Math.ceil(filteredLocations.length / locationLimit) || 1;
  const paginatedLocations = filteredLocations.slice(
    (locationPage - 1) * locationLimit,
    locationPage * locationLimit
  );

  // Location mutations
  const toggleLocationMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/locations/${id}/status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-all"] });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-all"] });
      setDeleteLocationTarget(null);
    },
  });

  // Stock KPIs calculation
  const lowStockCount = stockItems.filter((i) => {
    const current = Number(i.currentQuantity || 0);
    const reserved = Number(i.reservedQuantity || 0);
    const available = Math.max(0, current - reserved);
    const minAlert = Number(i.product?.minStockAlert || 0);
    return minAlert > 0 && available <= minAlert && available > 0;
  }).length;

  const outOfStockCount = stockItems.filter((i) => {
    const current = Number(i.currentQuantity || 0);
    const reserved = Number(i.reservedQuantity || 0);
    const available = Math.max(0, current - reserved);
    return available <= 0;
  }).length;

  const inStockCount = stockItems.filter((i) => {
    const current = Number(i.currentQuantity || 0);
    const reserved = Number(i.reservedQuantity || 0);
    const available = Math.max(0, current - reserved);
    const minAlert = Number(i.product?.minStockAlert || 0);
    return available > minAlert;
  }).length;

  // Helper movement badge
  const renderMovementBadge = (type: string) => {
    switch (type) {
      case "PURCHASE_RECEIPT":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
            Recepcionado Compra
          </Badge>
        );
      case "SALE_DELIVERY":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
            Despacho Venta POS
          </Badge>
        );
      case "POSITIVE_ADJUSTMENT":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
            Ajuste (+) Entrada
          </Badge>
        );
      case "NEGATIVE_ADJUSTMENT":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
            Ajuste (-) Salida
          </Badge>
        );
      case "SHRINKAGE_OUT":
        return (
          <Badge variant="destructive" className="text-[10px]">
            Merma / Pérdida
          </Badge>
        );
      case "TRANSFER_IN":
        return (
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px]">
            Entrada Traslado
          </Badge>
        );
      case "TRANSFER_OUT":
        return (
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px]">
            Salida Traslado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Almacenes y Control de Stock
            </h1>
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Kardex & Existencias
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo en tiempo real de existencias multi-almacén, ajustes manuales, traslados y trazabilidad Kardex.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStock();
              refetchMovements();
              refetchLocations();
            }}
            disabled={fetchingStock || fetchingMovements}
            className="gap-1.5 text-xs"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (fetchingStock || fetchingMovements) && "animate-spin"
              )}
            />
            Actualizar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdjustTargetProduct("");
              setAdjustTargetLocation("");
              setIsAdjustModalOpen(true);
            }}
            className="gap-1.5 text-xs shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Ajustar Stock
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setTransferTargetProduct("");
              setTransferTargetLocation("");
              setIsTransferModalOpen(true);
            }}
            className="gap-1.5 shadow-xs"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transferir Existencias
          </Button>

          {activeTab === "locations" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingLocation(null);
                setIsLocationModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Nuevo Almacén
            </Button>
          )}
        </div>
      </div>

      {/* Selection Cards Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Existencias */}
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
            activeTab === "stock"
              ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                activeTab === "stock"
                  ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Existencias de Stock</div>
              <div className="text-xs text-muted-foreground">
                Balance multi-almacén y alertas
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5",
              activeTab === "stock"
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                : "text-muted-foreground"
            )}
          >
            {stockTotal}
          </Badge>
        </button>

        {/* Card 2: Kardex */}
        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
            activeTab === "movements"
              ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                activeTab === "movements"
                  ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Kardex y Movimientos</div>
              <div className="text-xs text-muted-foreground">
                Auditoría de entradas y salidas
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5",
              activeTab === "movements"
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                : "text-muted-foreground"
            )}
          >
            {movementsTotal}
          </Badge>
        </button>

        {/* Card 3: Almacenes */}
        <button
          type="button"
          onClick={() => setActiveTab("locations")}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
            activeTab === "locations"
              ? "border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20 dark:bg-white/10 dark:border-white/40 dark:text-white"
              : "border-border/70 hover:border-border hover:bg-muted/30 bg-card text-foreground"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "p-2.5 rounded-lg transition-colors",
                activeTab === "locations"
                  ? "bg-primary text-primary-foreground dark:bg-white dark:text-neutral-900"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Almacenes y Sedes</div>
              <div className="text-xs text-muted-foreground">
                Centros físicos y depósitos
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5",
              activeTab === "locations"
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-white/20 dark:text-white dark:border-white/30"
                : "text-muted-foreground"
            )}
          >
            {locations.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: EXISTENCIAS */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          {/* Stock KPIs */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Registros Stock
                </CardTitle>
                <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
                  <Package className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{stockTotal}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Registros de existencias por almacén
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Stock Óptimo
                </CardTitle>
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{inStockCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Productos con existencias normales
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bajo Stock / Crítico
                </CardTitle>
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {lowStockCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Por debajo del nivel mínimo de alerta
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Productos Agotados
                </CardTitle>
                <div className="rounded-lg p-2 bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold text-destructive">
                  {outOfStockCount}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sin existencias físicas disponibles
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Table Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar existencias por SKU o producto..."
                    value={searchStock}
                    onChange={(e) => {
                      setSearchStock(e.target.value);
                      setStockPage(1);
                    }}
                    className="pl-9 pr-8 text-xs"
                  />
                  {(searchStock !== debouncedSearchStock || fetchingStock) && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filtrar por almacén"
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={filterLocation}
                    onChange={(e) => {
                      setFilterLocation(e.target.value);
                      setStockPage(1);
                    }}
                  >
                    <option value="ALL">Todos los Almacenes</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtrar por estado de existencias"
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={filterStockStatus}
                    onChange={(e) => {
                      setFilterStockStatus(
                        e.target.value as
                          | "ALL"
                          | "LOW_STOCK"
                          | "OUT_OF_STOCK"
                          | "IN_STOCK"
                      );
                      setStockPage(1);
                    }}
                  >
                    <option value="ALL">Todas las existencias</option>
                    <option value="LOW_STOCK">⚠️ Bajo Stock / Crítico</option>
                    <option value="IN_STOCK">✅ Con Existencias</option>
                    <option value="OUT_OF_STOCK">❌ Agotados (0)</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Producto
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Almacén y Ubicación
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Stock y Balance
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden md:table-cell">
                        Alerta Mín.
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStock ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              Cargando existencias...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : stockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No hay existencias registradas
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearchStock
                                ? "Prueba modificando los términos de búsqueda o filtros."
                                : "Realiza un ajuste manual o traspaso para registrar inventario."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockItems.map((item) => {
                        const current = Number(item.currentQuantity || 0);
                        const reserved = Number(item.reservedQuantity || 0);
                        const available = Math.max(0, current - reserved);
                        const minAlert = Number(item.product?.minStockAlert || 0);
                        const isCritical = minAlert > 0 && available <= minAlert;
                        const isOut = available <= 0;
                        const unit = item.product?.measurementUnit?.abbreviation || "und.";

                        return (
                          <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
                            <TableCell className="py-3.5 px-5">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground">
                                  {item.product?.name || "Producto"}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    SKU: {item.product?.sku || "-"}
                                  </span>
                                  {item.product?.category?.name && (
                                    <>
                                      <span className="text-muted-foreground text-[10px]">·</span>
                                      <span className="text-[11px] text-muted-foreground">
                                        {item.product.category.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-xs text-foreground">
                                  {item.location?.name || "Almacén"}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground mt-0.5">
                                  {item.specificLocation ? `Ubic: ${item.specificLocation}` : "Pasillo General"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {available} {unit}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  Físico: {current} | Reservado: {reserved}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground hidden md:table-cell">
                              {minAlert > 0 ? `${minAlert} ${unit}` : "—"}
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              {isOut ? (
                                <Badge variant="destructive" className="text-[10px] font-bold">
                                  Agotado
                                </Badge>
                              ) : isCritical ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                                >
                                  Stock Bajo
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                                >
                                  Óptimo
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      aria-label="Opciones de stock"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">
                                    Acciones de Stock
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAdjustTargetProduct(item.productId);
                                      setAdjustTargetLocation(item.locationId);
                                      setIsAdjustModalOpen(true);
                                    }}
                                    className="text-xs gap-2"
                                  >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Ajustar Inventario
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTransferTargetProduct(item.productId);
                                      setTransferTargetLocation(item.locationId);
                                      setIsTransferModalOpen(true);
                                    }}
                                    className="text-xs gap-2"
                                  >
                                    <ArrowLeftRight className="h-4 w-4" />
                                    Transferir a otro Almacén
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Stock Pagination */}
                <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
                  <span className="text-xs text-muted-foreground">
                    Página {stockPage} de {stockTotalPages || 1} ({stockTotal} registros)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockPage((p) => Math.max(p - 1, 1))}
                      disabled={stockPage <= 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockPage((p) => Math.min(p + 1, stockTotalPages))}
                      disabled={stockPage >= stockTotalPages}
                      className="h-8 text-xs"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: KARDEX MOVIMIENTOS */}
      {activeTab === "movements" && (
        <div className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por producto, SKU, motivo o responsable..."
                    value={searchMovement}
                    onChange={(e) => setSearchMovement(e.target.value)}
                    className="pl-9 pr-8 text-xs"
                  />
                  {searchMovement !== debouncedSearchMovement && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <select
                    aria-label="Filtrar tipo de movimiento Kardex"
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    value={movementTypeFilter}
                    onChange={(e) => {
                      setMovementTypeFilter(e.target.value);
                      setMovementPage(1);
                    }}
                  >
                    <option value="ALL">Todos los Movimientos Kardex</option>
                    <option value="PURCHASE_RECEIPT">Recepciones de Compras</option>
                    <option value="SALE_DELIVERY">Despachos por Venta</option>
                    <option value="POSITIVE_ADJUSTMENT">Ajustes Positivos (+)</option>
                    <option value="NEGATIVE_ADJUSTMENT">Ajustes Negativos (-)</option>
                    <option value="SHRINKAGE_OUT">Mermas y Pérdidas</option>
                    <option value="TRANSFER_IN">Traslados Entrantes</option>
                    <option value="TRANSFER_OUT">Traslados Salientes</option>
                  </select>

                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Total: <strong>{filteredMovements.length}</strong> movimientos
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Fecha / Hora
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tipo Movimiento
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Producto
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Almacén
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Cantidad / Balance
                      </TableHead>
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                        Motivo y Responsable
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovements ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              Cargando trazabilidad Kardex...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <History className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              Sin movimientos en este periodo
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearchMovement
                                ? "No hay registros que coincidan con la búsqueda."
                                : "Los movimientos de compras, ventas y ajustes aparecerán aquí."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMovements.map((mov) => {
                        const qty = Number(mov.quantity || 0);
                        const prev = Number(mov.previousStock || 0);
                        const res = Number(mov.resultingStock || 0);
                        const isPositive = qty > 0;

                        return (
                          <TableRow key={mov.id} className="transition-colors hover:bg-muted/40">
                            <TableCell className="py-3.5 px-5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(mov.movedAt).toLocaleString()}
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              {renderMovementBadge(mov.movementType)}
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground">
                                  {mov.product?.name || "Producto"}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                  SKU: {mov.product?.sku || "-"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-xs font-medium text-foreground">
                              {mov.inventory?.location?.name || "Almacén"}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-mono text-xs font-bold">
                              <div className="flex flex-col items-end">
                                <span
                                  className={
                                    isPositive
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-destructive"
                                  }
                                >
                                  {isPositive ? `+${qty}` : qty}
                                </span>
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  {prev} → {res}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-5 text-xs hidden sm:table-cell">
                              <div className="flex flex-col">
                                <span className="text-foreground line-clamp-1">
                                  {mov.reason || "Sin observación"}
                                </span>
                                <span className="text-[11px] text-muted-foreground mt-0.5">
                                  Resp: {mov.user?.name || "Sistema"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Movements Pagination */}
                <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
                  <span className="text-xs text-muted-foreground">
                    Página {movementPage} de {movementsTotalPages || 1} ({movementsTotal} movimientos)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMovementPage((p) => Math.max(p - 1, 1))}
                      disabled={movementPage <= 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMovementPage((p) => Math.min(p + 1, movementsTotalPages))}
                      disabled={movementPage >= movementsTotalPages}
                      className="h-8 text-xs"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: ALMACENES Y SUCURSALES */}
      {activeTab === "locations" && (
        <div className="space-y-6">
          {/* Warehouse KPIs */}
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Almacenes
                </CardTitle>
                <div className="rounded-lg p-2 bg-blue-500/10 text-blue-500">
                  <Warehouse className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">{locations.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Centros de almacenamiento físicos
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Almacén Principal
                </CardTitle>
                <div className="rounded-lg p-2 bg-purple-500/10 text-purple-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-base font-bold truncate">
                  {locations.find((l) => l.isDefault)?.name || "Sin definir"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sede predeterminada de despacho POS
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Almacenes Activos
                </CardTitle>
                <div className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500">
                  <Warehouse className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">
                  {locations.filter((l) => l.isActive).length}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disponibles para compras y traslados
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80 p-5 sm:p-6 gap-0">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ítems Alojadados
                </CardTitle>
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-500">
                  <Package className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold">
                  {locations.reduce((acc, l) => acc + (l._count?.inventories || 0), 0)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Líneas de producto distribuidas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Locations Table Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar almacén por nombre, código o dirección..."
                    value={searchLocation}
                    onChange={(e) => {
                      setSearchLocation(e.target.value);
                      setLocationPage(1);
                    }}
                    className="pl-9 pr-8 text-xs"
                  />
                  {searchLocation !== debouncedSearchLocation && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Mostrando {filteredLocations.length} de {locations.length} almacenes
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Almacén / Depósito
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                        Dirección Física
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Tipo
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Existencias
                      </TableHead>
                      <TableHead className="h-12 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Estado
                      </TableHead>
                      <TableHead className="h-12 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLocations ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">
                              Cargando almacenes...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Warehouse className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No se encontraron almacenes
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {debouncedSearchLocation
                                ? "Prueba con otro término de búsqueda"
                                : "Crea un nuevo almacén para comenzar."}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLocations.map((loc) => (
                        <TableRow key={loc.id} className="transition-colors hover:bg-muted/40">
                          <TableCell className="py-3.5 px-5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-foreground">
                                {loc.name}
                              </span>
                              <span className="font-mono text-[10px] bg-muted px-1 py-0.2 rounded text-muted-foreground w-fit mt-0.5">
                                {loc.code}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                            {loc.address || "—"}
                          </TableCell>
                          <TableCell className="py-3.5 px-4 text-center">
                            {loc.isDefault ? (
                              <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                                Principal
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Secundario</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-4 text-center">
                            <Badge variant="outline" className="text-xs font-mono">
                              {loc._count?.inventories || 0} ítems
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            {loc.isActive ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                              >
                                Activo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-muted bg-muted text-muted-foreground text-[10px]"
                              >
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    aria-label="Opciones de almacén"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel className="text-xs">
                                  Acciones
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingLocation(loc);
                                    setIsLocationModalOpen(true);
                                  }}
                                  className="text-xs gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Editar Almacén
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => toggleLocationMutation.mutate(loc.id)}
                                  className="text-xs gap-2"
                                >
                                  <Power className="h-4 w-4" />
                                  {loc.isActive ? "Desactivar" : "Activar"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteLocationTarget(loc)}
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Locations Pagination */}
                <div className="flex items-center justify-between border-t border-border px-5 py-4 bg-card">
                  <span className="text-xs text-muted-foreground">
                    Página {locationPage} de {locationTotalPages} ({filteredLocations.length} almacenes)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationPage((p) => Math.max(p - 1, 1))}
                      disabled={locationPage <= 1}
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationPage((p) => Math.min(p + 1, locationTotalPages))}
                      disabled={locationPage >= locationTotalPages}
                      className="h-8 text-xs"
                    >
                      Siguiente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjust Modal */}
      <AdjustStockModal
        open={isAdjustModalOpen}
        onOpenChange={setIsAdjustModalOpen}
        products={products}
        locations={locations}
        defaultProductId={adjustTargetProduct}
        defaultLocationId={adjustTargetLocation}
      />

      {/* Transfer Modal */}
      <TransferStockModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        products={products}
        locations={locations}
        defaultProductId={transferTargetProduct}
        defaultFromLocationId={transferTargetLocation}
      />

      {/* Location Modal */}
      <LocationFormModal
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        location={editingLocation}
      />

      {/* Delete Location Dialog */}
      <Dialog
        open={Boolean(deleteLocationTarget)}
        onOpenChange={(open) => !open && setDeleteLocationTarget(null)}
      >
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar almacén?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar el almacén{" "}
                <strong className="text-foreground">{deleteLocationTarget?.name}</strong>{" "}
                ({deleteLocationTarget?.code}).
              </p>
              <p className="text-xs text-muted-foreground">
                Si este almacén contiene existencias o registros en el Kardex, se mantendrá
                protegido para auditoría y no se permitirá la eliminación física.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteLocationTarget(null)}
              disabled={deleteLocationMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                deleteLocationTarget &&
                deleteLocationMutation.mutate(deleteLocationTarget.id)
              }
              disabled={deleteLocationMutation.isPending}
            >
              {deleteLocationMutation.isPending ? "Eliminando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
