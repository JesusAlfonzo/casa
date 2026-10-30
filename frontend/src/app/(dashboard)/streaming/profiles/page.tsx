"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  type StreamingAccount,
  type StreamingProfile,
} from "@/types/streaming";
import {
  MonitorPlay,
  Tv,
  Search,
  KeyRound,
  Edit2,
  Calendar,
  User,
  Plus,
  RefreshCw,
  Share2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { EditProfileModal } from "@/components/streaming/edit-profile-modal";

export default function StreamingProfilesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState<"ALL" | "FREE" | "OCCUPIED">("ALL");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("ALL");

  // Modal state
  const [editingProfile, setEditingProfile] = useState<StreamingProfile | null>(null);

  // Queries
  const {
    data: accountsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["streaming-accounts-profiles"],
    queryFn: async () => {
      const res = await api.get<{ items: StreamingAccount[] } | StreamingAccount[]>("/streaming-accounts?limit=100");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    },
  });

  const accounts = Array.isArray(accountsData) ? accountsData : [];

  // Toggle profile occupancy mutation
  const toggleOccupiedMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return api.patch(`/streaming-profiles/${profileId}/toggle-occupied`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-summary"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-stats"] });
    },
  });

  // Filter accounts
  const displayedAccounts = accounts.filter((acc) => {
    if (selectedAccountId !== "ALL" && acc.id !== selectedAccountId) return false;
    return true;
  });

  // Calculate totals
  const allProfiles = accounts.flatMap((a) => a.profiles || []);
  const totalFree = allProfiles.filter((p) => !p.isOccupied).length;
  const totalOccupied = allProfiles.filter((p) => p.isOccupied).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Matriz de Pantallas y Perfiles
            </h2>
            <Badge variant="outline" className="text-xs font-semibold">
              {allProfiles.length} Pantallas en Total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Control visual de perfiles asignados, PIN de seguridad y estado de ocupación por cuenta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/streaming">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Tv className="h-4 w-4" />
              <span>Cuentas Maestras</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          <Link href="/subscriptions">
            <Button size="sm" className="gap-1.5 text-xs shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Asignar Suscriptor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por correo, nombre de perfil o PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs max-w-xs"
          >
            <option value="ALL">Todas las cuentas maestras ({accounts.length})</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.service?.name} • {a.accessEmail}
              </option>
            ))}
          </select>
        </div>

        {/* Occupancy quick filters */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={occupancyFilter === "ALL" ? "default" : "outline"}
            size="xs"
            onClick={() => setOccupancyFilter("ALL")}
            className="rounded-full text-xs px-2.5"
          >
            Todas ({allProfiles.length})
          </Button>
          <Button
            type="button"
            variant={occupancyFilter === "FREE" ? "default" : "outline"}
            size="xs"
            onClick={() => setOccupancyFilter("FREE")}
            className="rounded-full text-xs px-2.5 gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle className="h-3 w-3" />
            <span>Libres ({totalFree})</span>
          </Button>
          <Button
            type="button"
            variant={occupancyFilter === "OCCUPIED" ? "default" : "outline"}
            size="xs"
            onClick={() => setOccupancyFilter("OCCUPIED")}
            className="rounded-full text-xs px-2.5 gap-1 text-blue-600 dark:text-blue-400"
          >
            <XCircle className="h-3 w-3" />
            <span>Ocupadas ({totalOccupied})</span>
          </Button>
        </div>
      </div>

      {/* Account Profile Matrix */}
      {isLoading ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          Cargando matriz de pantallas...
        </div>
      ) : displayedAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
          <MonitorPlay className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">
            No hay pantallas registradas
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            Crea una cuenta maestra de streaming para generar automáticamente sus pantallas y perfiles.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedAccounts.map((account) => {
            const profiles = (account.profiles || []).filter((p) => {
              if (occupancyFilter === "FREE" && p.isOccupied) return false;
              if (occupancyFilter === "OCCUPIED" && !p.isOccupied) return false;

              const term = searchTerm.toLowerCase();
              if (!term) return true;

              return (
                (p.profileName && p.profileName.toLowerCase().includes(term)) ||
                (p.profilePin && p.profilePin.includes(term)) ||
                account.accessEmail.toLowerCase().includes(term) ||
                (account.service?.name && account.service.name.toLowerCase().includes(term))
              );
            });

            if (profiles.length === 0 && (searchTerm || occupancyFilter !== "ALL")) {
              return null;
            }

            const freeCount = (account.profiles || []).filter((p) => !p.isOccupied).length;

            return (
              <Card key={account.id} className="border-border shadow-xs overflow-hidden">
                {/* Account Matrix Header */}
                <CardHeader className="p-3.5 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Tv className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {account.service?.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {account.accessEmail}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">
                          Clave: {account.accessPassword || "••••••••"}
                        </span>
                        {account.securityPin && (
                          <span>• PIN Cuenta: {account.securityPin}</span>
                        )}
                        <span>• Corte: {new Date(account.supplierCutoffDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={freeCount > 0 ? "secondary" : "outline"}
                      className="text-xs font-semibold"
                    >
                      {freeCount} de {account.profileCapacity} Libres
                    </Badge>
                  </div>
                </CardHeader>

                {/* Profiles Grid */}
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {profiles.map((profile) => {
                      const isFree = !profile.isOccupied;
                      const activeSub = profile.subscriptions?.[0];

                      return (
                        <div
                          key={profile.id}
                          className={`rounded-lg border p-3 flex flex-col justify-between transition-all space-y-3 shadow-2xs ${
                            isFree
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {/* Top: Slot & Status */}
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-foreground">
                              Pantalla #{profile.slotNumber}
                            </span>
                            <Badge
                              variant={isFree ? "secondary" : "outline"}
                              className={`text-[9px] px-1.5 py-0 font-semibold ${
                                isFree ? "text-emerald-700 dark:text-emerald-300" : ""
                              }`}
                            >
                              {isFree ? "DISPONIBLE" : "OCUPADA"}
                            </Badge>
                          </div>

                          {/* Profile details */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate">
                                {profile.profileName || `Perfil ${profile.slotNumber}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <KeyRound className="h-3 w-3" />
                              <span>PIN:</span>
                              <span className="font-mono font-bold text-foreground">
                                {profile.profilePin || "Sin PIN"}
                              </span>
                            </div>

                            {activeSub && (
                              <div className="pt-1 border-t border-border/60 text-[11px] text-muted-foreground space-y-0.5">
                                <div className="truncate font-medium text-foreground">
                                  {activeSub.customer?.name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  <span>Vence: {new Date(activeSub.expirationDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => setEditingProfile(profile)}
                              className="text-[11px] h-6 px-1.5 gap-1 text-muted-foreground hover:text-foreground"
                              title="Editar PIN y Nombre"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Editar</span>
                            </Button>

                            <Button
                              type="button"
                              variant={isFree ? "outline" : "ghost"}
                              size="xs"
                              onClick={() => toggleOccupiedMutation.mutate(profile.id)}
                              className={`text-[10px] h-6 px-1.5 ${
                                isFree
                                  ? "text-emerald-600 hover:text-emerald-700 border-emerald-500/30"
                                  : "text-muted-foreground hover:text-destructive"
                              }`}
                              title={isFree ? "Marcar ocupada manualmente" : "Liberar pantalla"}
                            >
                              {isFree ? "Marcar Uso" : "Liberar"}
                            </Button>

                            {isFree ? (
                              <Link
                                href={`/subscriptions?profileId=${profile.id}&serviceId=${account.serviceId}&accountId=${account.id}`}
                              >
                                <Button
                                  type="button"
                                  size="xs"
                                  className="text-[10px] h-6 px-2 font-bold"
                                  title="Crear suscripción para esta pantalla"
                                >
                                  Asignar
                                </Button>
                              </Link>
                            ) : activeSub?.customer?.phone ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => {
                                  const clean = activeSub.customer.phone?.replace(/[^0-9]/g, "");
                                  const text = `Hola ${activeSub.customer.name}, tus credenciales de ${account.service?.name} son:\nCorreo: ${account.accessEmail}\nClave: ${account.accessPassword}\nPerfil: ${profile.profileName || `Pantalla ${profile.slotNumber}`}\nPIN: ${profile.profilePin || "Sin PIN"}\nVence: ${new Date(activeSub.expirationDate).toLocaleDateString()}`;
                                  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
                                }}
                                className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                                title="Enviar credenciales por WhatsApp"
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        profile={editingProfile}
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      />
    </div>
  );
}
