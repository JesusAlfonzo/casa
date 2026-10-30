"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useClientNow } from "@/lib/utils";
import {
  type StreamingAccount,
  type Service,
  type Supplier,
  type StreamingStats,
} from "@/types/streaming";
import {
  Tv,
  Search,
  Plus,
  RefreshCw,
  KeyRound,
  Calendar,
  Users,
  AlertTriangle,
  MonitorPlay,
  RotateCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAccountModal } from "@/components/streaming/create-account-modal";
import { RenewCutoffModal } from "@/components/streaming/renew-cutoff-modal";

export default function StreamingAccountsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const nowTimestamp = useClientNow();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renewAccount, setRenewAccount] = useState<StreamingAccount | null>(null);

  // Queries
  const {
    data: accountsData,
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
    isFetching,
  } = useQuery({
    queryKey: ["streaming-accounts-list"],
    queryFn: async () => {
      const res = await api.get<{ items: StreamingAccount[] } | StreamingAccount[]>("/streaming-accounts?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["streaming-stats"],
    queryFn: () => api.get<StreamingStats>("/streaming-accounts/stats").catch(() => null),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services-list"],
    queryFn: async () => {
      const res = await api.get<{ data: Service[] } | Service[]>("/services");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => {
      const res = await api.get<{ items: Supplier[] } | Supplier[]>("/suppliers");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/streaming-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-summary"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-stats"] });
    },
  });

  const handleDeleteAccount = (acc: StreamingAccount) => {
    if (confirm(`¿Estás seguro de eliminar la cuenta ${acc.accessEmail}? Se desvincularán sus perfiles asociados.`)) {
      deleteAccountMutation.mutate(acc.id);
    }
  };

  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];
  const suppliers = Array.isArray(suppliersData) ? suppliersData : [];

  const filteredAccounts = accounts.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    const term = searchTerm.toLowerCase();
    return (
      a.accessEmail.toLowerCase().includes(term) ||
      (a.service?.name && a.service.name.toLowerCase().includes(term)) ||
      (a.supplier?.legalName && a.supplier.legalName.toLowerCase().includes(term))
    );
  });

  const togglePassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalCapacity = statsData?.totalCapacity ?? accounts.reduce((acc, a) => acc + (a.profileCapacity || 0), 0);
  const totalOccupied = statsData?.totalOccupiedProfiles ?? accounts.reduce((acc, a) => acc + (a.occupiedProfiles || 0), 0);
  const availableSlots = totalCapacity - totalOccupied;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Cuentas Maestras de Streaming
          </h2>
          <p className="text-sm text-muted-foreground">
            Control de parque de cuentas (Netflix, Disney, Spotify), vencimiento de proveedores y pantallas libres.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/streaming/profiles">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <MonitorPlay className="h-4 w-4" />
              <span>Matriz de Pantallas</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAccounts()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Cuenta Maestra</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cuentas Maestras
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <Tv className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold">{accounts.length}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {accounts.filter((a) => a.status === "AVAILABLE").length} con perfiles libres
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pantallas / Ocupación
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Users className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold">
              {totalOccupied} / {totalCapacity}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{availableSlots} pantallas listas para vender</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Por Vencer (≤ 3 días)
            </CardTitle>
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {
                accounts.filter((a) => {
                  if (nowTimestamp === 0) return false;
                  const days = Math.ceil(
                    (new Date(a.supplierCutoffDate).getTime() - nowTimestamp) /
                      (1000 * 3600 * 24)
                  );
                  return days >= 0 && days <= 3;
                }).length
              }
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Requieren pago al proveedor pronto
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Vencidas / Caídas
            </CardTitle>
            <div className="rounded-md bg-destructive/10 p-1.5 text-destructive">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-destructive">
              {accounts.filter((a) => a.status === "EXPIRED" || a.status === "DOWN_SUPPORT").length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cuentas inactivas o en garantía
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por correo, servicio o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("ALL")}
            className="rounded-full text-xs px-2.5"
          >
            Todas ({accounts.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "AVAILABLE" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("AVAILABLE")}
            className="rounded-full text-xs px-2.5"
          >
            Disponibles
          </Button>
          <Button
            type="button"
            variant={statusFilter === "FULL" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("FULL")}
            className="rounded-full text-xs px-2.5"
          >
            Llenas
          </Button>
          <Button
            type="button"
            variant={statusFilter === "EXPIRED" ? "default" : "outline"}
            size="xs"
            onClick={() => setStatusFilter("EXPIRED")}
            className="rounded-full text-xs px-2.5"
          >
            Vencidas
          </Button>
        </div>
      </div>

      {/* Account Cards Grid */}
      {loadingAccounts ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          Cargando parque de cuentas...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
          <Tv className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No se encontraron cuentas maestras
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            {searchTerm
              ? "Prueba cambiando los términos de búsqueda o el filtro de estado."
              : "Registra tu primera cuenta maestra de streaming para comenzar a asignar perfiles."}
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar Cuenta</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => {
            const available = account.profileCapacity - account.occupiedProfiles;
            const cutoff = new Date(account.supplierCutoffDate);
            const daysRemaining = nowTimestamp > 0
              ? Math.ceil((cutoff.getTime() - nowTimestamp) / (1000 * 3600 * 24))
              : 0;
            const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;
            const isExpired = daysRemaining < 0;

            return (
              <Card
                key={account.id}
                className="border-border shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-1 font-bold">
                        {account.service?.name || "Servicio"}
                      </Badge>
                      <CardTitle className="text-sm font-semibold truncate max-w-[210px] text-foreground">
                        {account.accessEmail}
                      </CardTitle>
                    </div>

                    <Badge
                      variant={
                        isExpired || account.status === "EXPIRED"
                          ? "destructive"
                          : isExpiringSoon
                            ? "outline"
                            : account.status === "AVAILABLE"
                              ? "secondary"
                              : "outline"
                      }
                      className="text-[10px]"
                    >
                      {isExpired
                        ? "VENCIDA"
                        : isExpiringSoon
                          ? `VENCE EN ${daysRemaining}D`
                          : account.status}
                    </Badge>
                  </div>

                  {account.supplier && (
                    <p className="text-[11px] text-muted-foreground">
                      Proveedor: <strong className="text-foreground">{account.supplier.legalName}</strong>
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Credentials block */}
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Clave:</span>
                        <span className="font-mono text-foreground font-semibold">
                          {revealedPasswords[account.id]
                            ? account.accessPassword || "••••••••"
                            : "••••••••"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePassword(account.id)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        {revealedPasswords[account.id] ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>

                    {account.securityPin && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <span>PIN Maestro:</span>
                        <span className="font-mono font-bold text-foreground">
                          {account.securityPin}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Profile Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Perfiles Ocupados</span>
                      </span>
                      <span className="font-bold text-foreground">
                        {account.occupiedProfiles} / {account.profileCapacity}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          available === 0
                            ? "bg-red-500"
                            : available === 1
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (account.occupiedProfiles / account.profileCapacity) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{available > 0 ? `${available} libre(s)` : "Cuenta llena"}</span>
                      {Number(account.accountCost || 0) > 0 && (
                        <span>Costo: ${Number(account.accountCost).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Cutoff Date */}
                  <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Corte proveedor:</span>
                    </span>
                    <span
                      className={`font-semibold font-mono ${
                        isExpired
                          ? "text-destructive"
                          : isExpiringSoon
                            ? "text-amber-500"
                            : "text-foreground"
                      }`}
                    >
                      {cutoff.toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/70">
                    <Link
                      href={`/streaming/profiles?accountId=${account.id}`}
                      className="flex-1"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        className="w-full gap-1 text-xs h-7"
                      >
                        <MonitorPlay className="h-3 w-3" />
                        <span>Ver Pantallas</span>
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setRenewAccount(account)}
                      className="gap-1 text-xs h-7 text-primary hover:text-primary"
                      title="Extender fecha con proveedor"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>+30d</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteAccount(account)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Account Modal */}
      <CreateAccountModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        services={services}
        suppliers={suppliers}
      />

      {/* Renew Cutoff Modal */}
      <RenewCutoffModal
        account={renewAccount}
        open={!!renewAccount}
        onOpenChange={(open) => !open && setRenewAccount(null)}
      />
    </div>
  );
}
