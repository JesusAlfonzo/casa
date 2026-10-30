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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  // Stock filters
  const [searchStock, setSearchStock] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("ALL");
  const [filterStockStatus, setFilterStockStatus] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK">("ALL");
  const [stockPage, setStockPage] = useState(1);
  const stockLimit = 15;

  // Movements filters
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("ALL");
  const [movementPage, setMovementPage] = useState(1);
  const movementLimit = 20;

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
  if (searchStock.trim()) stockParams.set("search", searchStock.trim());

  const {
    data: stockRes,
    isLoading: loadingStock,
    refetch: refetchStock,
    isFetching: fetchingStock,
  } = useQuery({
    queryKey: ["inventories-list", stockPage, filterLocation, filterStockStatus, searchStock],
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

  const movements = movementsRes?.data || [];
  const movementsTotal = movementsRes?.total || 0;
  const movementsTotalPages = movementsRes?.totalPages || 1;

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

  // Helper movement badge
  const renderMovementBadge = (type: string) => {
    switch (type) {
      case "PURCHASE_RECEIPT":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]">
            Recepcionado Compra
          </Badge>
        );
      case "SALE_DELIVERY":
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 text-[10px]">
            Despacho Venta POS
          </Badge>
        );
      case "POSITIVE_ADJUSTMENT":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]">
            Ajuste (+) Entrada
          </Badge>
        );
      case "NEGATIVE_ADJUSTMENT":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px]">
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
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 text-[10px]">
            Entrada Traslado
          </Badge>
        );
      case "TRANSFER_OUT":
        return (
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 text-[10px]">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Almacenes y Control de Stock
            </h1>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Kardex & Existencias
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
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
              className={`h-3.5 w-3.5 ${
                fetchingStock || fetchingMovements ? "animate-spin" : ""
              }`}
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) =>
          setActiveTab(val as "stock" | "movements" | "locations")
        }
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="stock" className="gap-2 text-xs">
            <Package className="h-4 w-4" />
            Existencias ({stockTotal})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2 text-xs">
            <History className="h-4 w-4" />
            Kardex / Historial
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2 text-xs">
            <Warehouse className="h-4 w-4" />
            Almacenes ({locations.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EXISTENCIAS */}
        <TabsContent value="stock" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 lg:max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar existencias por SKU o producto..."
                    value={searchStock}
                    onChange={(e) => {
                      setSearchStock(e.target.value);
                      setStockPage(1);
                    }}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filtrar por almacén"
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            <CardContent className="p-4 pt-2">
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Almacén / Depósito</TableHead>
                      <TableHead>Ubicación Pasillo</TableHead>
                      <TableHead className="text-right">Físico Actual</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right font-bold">Disponible</TableHead>
                      <TableHead className="text-center">Alerta Mín.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStock ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="text-xs text-muted-foreground">
                              Cargando existencias...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : stockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No hay existencias registradas
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Prueba modificando los filtros o realiza un ajuste manual.
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

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground">
                                  {item.product?.name || "Producto"}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  SKU: {item.product?.sku || "-"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="font-semibold text-xs text-foreground">
                                {item.location?.name || "Almacén"}
                              </span>
                            </TableCell>

                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.specificLocation || "General"}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs">
                              {current}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {reserved}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs font-bold text-primary">
                              {available} {item.product?.measurementUnit?.abbreviation || "und."}
                            </TableCell>

                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {minAlert}
                            </TableCell>

                            <TableCell>
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

                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  setAdjustTargetProduct(item.productId);
                                  setAdjustTargetLocation(item.locationId);
                                  setIsAdjustModalOpen(true);
                                }}
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                Ajustar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Stock Pagination */}
              <div className="flex items-center justify-between border-t border-border px-2 py-3 text-xs text-muted-foreground mt-2">
                <span>
                  Total registros: <strong>{stockTotal}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Página {stockPage} de {stockTotalPages || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled={stockPage <= 1}
                    onClick={() => setStockPage(stockPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled={stockPage >= stockTotalPages}
                    onClick={() => setStockPage(stockPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: KARDEX MOVIMIENTOS */}
        <TabsContent value="movements" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
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
                </div>

                <span className="text-xs text-muted-foreground">
                  Registros en Kardex: <strong>{movementsTotal}</strong>
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Fecha / Hora</TableHead>
                      <TableHead>Tipo Movimiento</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Almacén</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-center">Stock Anterior → Final</TableHead>
                      <TableHead>Motivo / Observación</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovements ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="text-xs text-muted-foreground">
                              Cargando trazabilidad Kardex...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-44 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <History className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              Sin movimientos en este periodo
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((mov) => {
                        const qty = Number(mov.quantity || 0);
                        const prev = Number(mov.previousStock || 0);
                        const res = Number(mov.resultingStock || 0);
                        const isPositive = qty > 0;

                        return (
                          <TableRow key={mov.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {new Date(mov.movedAt).toLocaleString()}
                            </TableCell>

                            <TableCell>{renderMovementBadge(mov.movementType)}</TableCell>

                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground">
                                  {mov.product?.name || "Producto"}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {mov.product?.sku}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs">
                              {mov.inventory?.location?.name || "Almacén"}
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs font-bold">
                              <span
                                className={
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                }
                              >
                                {isPositive ? `+${qty}` : qty}
                              </span>
                            </TableCell>

                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-muted-foreground">{prev}</span>
                              <span className="mx-1 text-muted-foreground">→</span>
                              <span className="font-bold text-foreground">{res}</span>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {mov.reason || "-"}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {mov.user?.name || "Sistema"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Movements Pagination */}
              <div className="flex items-center justify-between border-t border-border px-2 py-3 text-xs text-muted-foreground mt-2">
                <span>
                  Total movimientos: <strong>{movementsTotal}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Página {movementPage} de {movementsTotalPages || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled={movementPage <= 1}
                    onClick={() => setMovementPage(movementPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled={movementPage >= movementsTotalPages}
                    onClick={() => setMovementPage(movementPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ALMACENES Y SUCURSALES */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Centros de Almacenamiento
              </h3>
              <p className="text-xs text-muted-foreground">
                Almacenes físicos, bodegas y sucursales comerciales.
              </p>
            </div>
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
          </div>

          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección Física</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-center">Existencias Alojad.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLocations ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="text-xs text-muted-foreground">
                              Cargando almacenes...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : locations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Warehouse className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              No hay almacenes configurados
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      locations.map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell className="font-mono text-xs font-bold text-foreground">
                            {loc.code}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {loc.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {loc.address || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {loc.isDefault ? (
                              <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                                Principal
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Secundario</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs font-mono">
                              {loc._count?.inventories || 0} ítems
                            </Badge>
                          </TableCell>
                          <TableCell>
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
                          <TableCell className="text-right">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar almacén?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Estás a punto de eliminar el almacén{" "}
                <strong>{deleteLocationTarget?.name}</strong> ({deleteLocationTarget?.code}).
              </p>
              <p className="text-xs text-muted-foreground">
                Si este almacén contiene existencias o registros en el Kardex, se mantendrá
                protegido para auditoría y no se permitirá la eliminación física.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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
