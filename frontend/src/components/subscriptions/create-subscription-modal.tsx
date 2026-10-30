"use client";

import React, { useState } from "react";
import {
  type Service,
  type Customer,
  type StreamingAccount,
} from "@/types/streaming";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CreditCard, Calendar, User, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  services: Service[];
  streamingAccounts: StreamingAccount[];
  initialServiceId?: string;
  initialAccountId?: string;
  initialProfileId?: string;
}

export function CreateSubscriptionModal({
  open,
  onOpenChange,
  customers,
  services,
  streamingAccounts,
  initialServiceId,
  initialAccountId,
  initialProfileId,
}: CreateSubscriptionModalProps) {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");
  const [streamingAccountId, setStreamingAccountId] = useState(initialAccountId || "");
  const [streamingProfileId, setStreamingProfileId] = useState(initialProfileId || "");
  const [agreedPrice, setAgreedPrice] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync initial props during render
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setStartDate(new Date().toISOString().split("T")[0]);
    if (initialServiceId) setServiceId(initialServiceId);
    if (initialAccountId) setStreamingAccountId(initialAccountId);
    if (initialProfileId) setStreamingProfileId(initialProfileId);

    const srv = services.find((s) => s.id === (initialServiceId || services[0]?.id));
    if (srv) {
      setAgreedPrice(Number(srv.basePrice || 0));
      setDurationDays(srv.defaultDurationDays || 30);
    }
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Filter streaming accounts by selected service
  const compatibleAccounts = streamingAccounts.filter(
    (a) => a.serviceId === serviceId && (a.status === "AVAILABLE" || a.id === streamingAccountId)
  );

  const selectedAccount = streamingAccounts.find((a) => a.id === streamingAccountId);
  const freeProfiles = selectedAccount?.profiles?.filter(
    (p) => !p.isOccupied || p.id === streamingProfileId
  ) || [];

  // Expiration calculation
  const expDate = new Date(startDate);
  expDate.setDate(expDate.getDate() + durationDays);

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const srv = services.find((s) => s.id === id);
    if (srv) {
      setAgreedPrice(Number(srv.basePrice || 0));
      setDurationDays(srv.defaultDurationDays || 30);
    }
    setStreamingAccountId("");
    setStreamingProfileId("");
  };

  const handleAccountChange = (id: string) => {
    setStreamingAccountId(id);
    const acc = streamingAccounts.find((a) => a.id === id);
    const firstFreeProfile = acc?.profiles?.find((p) => !p.isOccupied);
    if (firstFreeProfile) {
      setStreamingProfileId(firstFreeProfile.id);
    } else {
      setStreamingProfileId("");
    }
  };

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!customerId) throw new Error("Debes seleccionar un cliente.");
      if (!serviceId) throw new Error("Debes seleccionar un servicio.");

      const payload = {
        customerId,
        serviceId,
        streamingAccountId: streamingAccountId || undefined,
        streamingProfileId: streamingProfileId || undefined,
        agreedPrice,
        durationDays,
        startDate: new Date(startDate).toISOString(),
        expirationDate: expDate.toISOString(),
        autoRenew,
        notes: notes.trim() || undefined,
      };

      return api.post("/subscriptions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-stats"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      onOpenChange(false);
      setNotes("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al crear la suscripción.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <DialogTitle>Nueva Suscripción de Cliente</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Asigna un servicio o pantalla de streaming a un cliente con fecha de corte y precio pactado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="sub-cust">Cliente *</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <select
                id="sub-cust"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.lastName || ""} {c.documentId ? `(${c.documentId})` : ""} {c.phone ? `• ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label htmlFor="sub-srv">Servicio Contratado *</Label>
            <select
              id="sub-srv"
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${Number(s.basePrice).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Streaming Account & Profile Screen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-acc">Cuenta Maestra Asignada</Label>
              <select
                id="sub-acc"
                value={streamingAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Seleccionar cuenta libre...</option>
                {compatibleAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accessEmail} ({a.profileCapacity - a.occupiedProfiles} libres)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-prof">Pantalla / Perfil</Label>
              <select
                id="sub-prof"
                value={streamingProfileId}
                onChange={(e) => setStreamingProfileId(e.target.value)}
                disabled={!streamingAccountId}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Seleccionar pantalla...</option>
                {freeProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    Pantalla #{p.slotNumber} {p.profilePin ? `(PIN: ${p.profilePin})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-price">Precio Pactado ($ USD) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="sub-price"
                  type="number"
                  step="0.01"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(Number(e.target.value) || 0)}
                  className="pl-8 h-9 text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-days">Duración (Días) *</Label>
              <Input
                id="sub-days"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Dates Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-start">Fecha de Inicio *</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="sub-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de Vencimiento Calculada</Label>
              <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center font-mono font-bold text-foreground">
                {expDate.toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <span className="font-semibold text-foreground">Renovación Automática</span>
              <p className="text-[11px] text-muted-foreground">
                Genera avisos de cobro por WhatsApp al aproximarse la fecha de corte.
              </p>
            </div>
            <Button
              type="button"
              variant={autoRenew ? "default" : "outline"}
              size="xs"
              onClick={() => setAutoRenew(!autoRenew)}
              className="text-xs font-semibold"
            >
              {autoRenew ? "Activada" : "Desactivada"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-notes">Observaciones (Opcional)</Label>
            <Input
              id="sub-notes"
              placeholder="Ej: Cliente solicitó pantalla en idioma inglés..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="p-3 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => createSubscriptionMutation.mutate()}
            disabled={createSubscriptionMutation.isPending}
            className="gap-1.5 shadow-xs font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{createSubscriptionMutation.isPending ? "Asignando..." : "Crear Suscripción"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
