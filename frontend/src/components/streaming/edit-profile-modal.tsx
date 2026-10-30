"use client";

import React, { useState } from "react";
import { type StreamingProfile } from "@/types/streaming";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { MonitorPlay, KeyRound, User, CheckCircle2, AlertCircle } from "lucide-react";
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

interface EditProfileModalProps {
  profile: StreamingProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({
  profile,
  open,
  onOpenChange,
}: EditProfileModalProps) {
  const queryClient = useQueryClient();

  const [profileName, setProfileName] = useState(profile?.profileName || "");
  const [profilePin, setProfilePin] = useState(profile?.profilePin || "");
  const [isOccupied, setIsOccupied] = useState(profile?.isOccupied || false);
  const [error, setError] = useState<string | null>(null);

  // Sync state during render when profile changes
  const [prevProfileId, setPrevProfileId] = useState<string | null>(null);
  if (profile && profile.id !== prevProfileId) {
    setPrevProfileId(profile.id);
    setProfileName(profile.profileName || "");
    setProfilePin(profile.profilePin || "");
    setIsOccupied(profile.isOccupied);
    setError(null);
  } else if (!profile && prevProfileId !== null) {
    setPrevProfileId(null);
  }

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      return api.patch(`/streaming-profiles/${profile.id}`, {
        profileName: profileName.trim() || undefined,
        profilePin: profilePin.trim() || undefined,
        isOccupied,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaming-profiles-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["streaming-summary"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Error al actualizar la pantalla.");
    },
  });

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <MonitorPlay className="h-5 w-5" />
            <DialogTitle>Editar Pantalla #{profile.slotNumber}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Modifica el nombre visible en la app de streaming y el PIN de 4 dígitos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">Nombre del Perfil (en la app)</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="prof-name"
                placeholder={`Pantalla ${profile.slotNumber}`}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-pin">PIN de Bloqueo de Perfil</Label>
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="prof-pin"
                placeholder="Ej: 1234"
                value={profilePin}
                onChange={(e) => setProfilePin(e.target.value)}
                className="pl-8 h-9 text-xs font-mono"
                maxLength={6}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <span className="font-semibold text-foreground">Estado de Ocupación</span>
              <p className="text-[11px] text-muted-foreground">
                {isOccupied ? "Perfil marcado como ocupado / en uso" : "Perfil disponible para vender"}
              </p>
            </div>
            <Button
              type="button"
              variant={isOccupied ? "default" : "outline"}
              size="xs"
              onClick={() => setIsOccupied(!isOccupied)}
              className="text-xs font-semibold"
            >
              {isOccupied ? "Ocupado" : "Libre"}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{updateProfileMutation.isPending ? "Guardando..." : "Guardar Cambios"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
