"use client";

import React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Server, User, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuth();

  const { data: health, isLoading: loadingHealth, isError } = useQuery({
    queryKey: ["backend-health-detailed"],
    queryFn: () => api.get<{ status: string; timestamp: string }>("/health"),
  });

  const isUp = !isError && health?.status === "UP";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración del Sistema
        </h2>
        <p className="text-sm text-muted-foreground">
          Información general de la instancia, conexión al backend Express y perfil de usuario.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Profile Card */}
        <Card className="border-border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Perfil del Usuario</CardTitle>
            </div>
            <CardDescription>Detalles del operador con sesión actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Nombre:</span>
              <span className="font-semibold text-foreground">{user?.name} {user?.lastName || ""}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Correo:</span>
              <span className="font-mono text-foreground">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Usuario:</span>
              <span className="font-mono text-foreground">{user?.username || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Estado de Cuenta:</span>
              <Badge variant="secondary" className="text-[10px]">
                {user?.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Backend & Environment Card */}
        <Card className="border-border shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Estado de la API Backend</CardTitle>
            </div>
            <CardDescription>Verificación del servidor Express y Better Auth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-muted-foreground">Conexión Backend (/health):</span>
              <div className="flex items-center gap-1.5">
                {loadingHealth ? (
                  <span className="text-muted-foreground">Comprobando...</span>
                ) : isUp ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <Badge variant="secondary" className="text-[10px]">Operativo</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive" className="text-[10px]">Sin conexión</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Proxy de Next.js:</span>
              <span className="font-mono text-foreground">/api/* → Backend:4000</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Framework UI:</span>
              <span className="text-foreground">Next.js 16 + shadcn/ui (Tailwind v4)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Paleta Visual:</span>
              <span className="text-foreground">Zinc Neutral (Dark / Light)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
