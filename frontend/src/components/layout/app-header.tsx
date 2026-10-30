"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Menu,
  Bell,
  Search,
  Activity,
  User as UserIcon,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Monitor backend health
  const { data: healthData, isError } = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => api.get<{ status: string; timestamp: string }>("/health"),
    refetchInterval: 30000,
    retry: false,
  });

  const getBreadcrumbTitle = (path: string) => {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0 || segments[0] === "dashboard") {
      return "Panel General";
    }
    const map: Record<string, string> = {
      sales: "Ventas y POS",
      customers: "Clientes",
      products: "Catálogo de Productos",
      categories: "Categorías y Marcas",
      inventory: "Inventario y Almacenes",
      purchases: "Compras a Proveedores",
      streaming: "Cuentas Streaming",
      profiles: "Perfiles y Pantallas",
      subscriptions: "Suscripciones Clientes",
      finances: "Finanzas",
      accounts: "Cuentas Bancarias",
      transactions: "Transacciones de Pago",
      "exchange-rates": "Tasas de Cambio",
      admin: "Administración",
      users: "Usuarios",
      roles: "Roles y Permisos",
      settings: "Configuración",
    };
    return segments.map((s) => map[s] || s).join(" / ");
  };

  const isBackendHealthy = !isError && healthData?.status === "UP";

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-64 border-r">
            <SheetTitle className="sr-only">Navegación Móvil</SheetTitle>
            <AppSidebar onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div>
          <h1 className="text-base font-semibold capitalize text-foreground sm:text-lg">
            {getBreadcrumbTitle(pathname)}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            CASA ERP • Panel de Control
          </p>
        </div>
      </div>

      {/* Right: Actions, Backend Status, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend Status indicator */}
        <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs sm:flex">
          <Activity
            className={`h-3.5 w-3.5 ${
              isBackendHealthy ? "text-emerald-500 animate-pulse" : "text-amber-500"
            }`}
          />
          <span className="text-muted-foreground">API:</span>
          <Badge
            variant={isBackendHealthy ? "secondary" : "outline"}
            className="text-[10px] px-1.5 py-0 font-normal"
          >
            {isBackendHealthy ? "Conectado" : "Offline"}
          </Badge>
        </div>

        {/* Search trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden h-9 items-center gap-2 px-3 text-xs text-muted-foreground md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Buscar (Ctrl + K)</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 rounded-full p-1 sm:px-2"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="hidden text-xs font-medium text-foreground sm:inline-block">
                  {user?.name || "Usuario"}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || "Usuario"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "usuario@erp.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
