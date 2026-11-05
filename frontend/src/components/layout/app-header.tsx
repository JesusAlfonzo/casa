"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { AppSidebar } from "./app-sidebar";
import { NotificationCenter } from "./notification-center";
import { CommandPalette } from "./command-palette";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Menu,
  Search,
  Activity,
  User as UserIcon,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  ChevronRight,
  Home,
  Plus,
  BadgeDollarSign,
  Keyboard,
  Settings,
  Sparkles,
  ShoppingCart,
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BreadcrumbPart {
  label: string;
  href?: string;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Monitor backend health
  const { data: healthData, isError } = useQuery({
    queryKey: ["backend-health"],
    queryFn: () => api.get<{ status: string; timestamp: string }>("/health"),
    refetchInterval: 30000,
    retry: false,
  });

  // Monitor official BCV rate
  const { data: exchangeRate } = useQuery({
    queryKey: ["current-bcv-rate"],
    queryFn: async () => {
      try {
        const res = await api.get<{ rate?: number | string; data?: { rate?: number | string } }>("/exchange-rates/current");
        if (res && typeof res === "object") {
          const rateVal = res.rate ?? res.data?.rate;
          return Number(rateVal) || 0;
        }
        return 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 60000,
  });

  // Global hotkeys (Ctrl+K for Command Palette, Alt+shortcuts for navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }

      if (e.altKey && !isInput) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          router.push("/sales");
        } else if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          router.push("/dashboard");
        } else if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          router.push("/inventory");
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          router.push("/streaming");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Compute segmented breadcrumb hierarchy
  const breadcrumbParts = useMemo<BreadcrumbPart[]>(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || segments[0] === "dashboard") {
      return [{ label: "Panel General" }];
    }

    const groupMap: Record<
      string,
      { group: string; label: string; rootHref: string }
    > = {
      sales: { group: "Ventas y Clientes", label: "Ventas (POS)", rootHref: "/sales" },
      customers: { group: "Ventas y Clientes", label: "Clientes", rootHref: "/customers" },
      products: { group: "Inventario y Catálogo", label: "Productos", rootHref: "/products" },
      categories: { group: "Inventario y Catálogo", label: "Categorías y Marcas", rootHref: "/categories" },
      inventory: { group: "Inventario y Catálogo", label: "Almacenes y Stock", rootHref: "/inventory" },
      suppliers: { group: "Inventario y Catálogo", label: "Proveedores", rootHref: "/suppliers" },
      purchases: { group: "Inventario y Catálogo", label: "Compras a Proveedores", rootHref: "/purchases" },
      streaming: { group: "Streaming y Servicios", label: "Cuentas Streaming", rootHref: "/streaming" },
      profiles: { group: "Streaming y Servicios", label: "Pantallas y Perfiles", rootHref: "/streaming/profiles" },
      subscriptions: { group: "Streaming y Servicios", label: "Suscripciones Clientes", rootHref: "/subscriptions" },
      finances: { group: "Finanzas y Tesorería", label: "Finanzas", rootHref: "/finances/accounts" },
      accounts: { group: "Finanzas y Tesorería", label: "Cuentas y Cajas", rootHref: "/finances/accounts" },
      transactions: { group: "Finanzas y Tesorería", label: "Pagos y Cobros", rootHref: "/finances/transactions" },
      "exchange-rates": { group: "Finanzas y Tesorería", label: "Tasas de Cambio", rootHref: "/finances/exchange-rates" },
      reports: { group: "General", label: "Reportes & Exportación", rootHref: "/reports" },
      admin: { group: "Administración", label: "Administración", rootHref: "/admin/users" },
      users: { group: "Administración", label: "Usuarios", rootHref: "/admin/users" },
      roles: { group: "Administración", label: "Roles y Permisos", rootHref: "/admin/roles" },
      settings: { group: "Sistema", label: "Configuración", rootHref: "/settings" },
    };

    const parts: BreadcrumbPart[] = [];
    const primarySegment = segments[0];
    const info = groupMap[primarySegment];

    if (info) {
      parts.push({ label: info.group, href: info.rootHref });
    }

    if (segments.length > 1) {
      const subSegment = segments[segments.length - 1];
      const subInfo = groupMap[subSegment];
      if (subInfo) {
        parts.push({ label: subInfo.label });
      } else {
        parts.push({ label: subSegment });
      }
    } else if (info) {
      parts.push({ label: info.label });
    } else {
      parts.push({ label: primarySegment });
    }

    return parts;
  }, [pathname]);

  const isBackendHealthy =
    !isError && (healthData?.status === "UP" || healthData?.status === "OK");

  return (
    <TooltipProvider delay={150}>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/90 px-3 sm:px-6 backdrop-blur-md transition-colors shadow-2xs">
        {/* LEFT SECTION: Mobile Toggle, Desktop Sidebar Toggle & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Drawer Trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden h-9 w-9 shrink-0"
                  aria-label="Abrir menú móvil"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-64 border-r">
              <SheetTitle className="sr-only">Navegación Móvil</SheetTitle>
              <AppSidebar forceExpanded onItemClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar Toggle Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="hidden md:inline-flex text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 rounded-lg hover:bg-muted/80"
                  aria-label="Alternar barra lateral (Ctrl+B)"
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="bottom">
              <span>{isCollapsed ? "Desplegar menú (Ctrl+B)" : "Guardar menú (Ctrl+B)"}</span>
            </TooltipContent>
          </Tooltip>

          {/* Segmented Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 transition-colors"
              title="Ir al inicio / Dashboard"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>

            <span className="hidden sm:inline-block text-muted-foreground/40 font-light">
              /
            </span>

            {breadcrumbParts.map((part, index) => {
              const isLast = index === breadcrumbParts.length - 1;

              return (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  )}
                  {isLast ? (
                    <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-none text-xs sm:text-sm">
                      {part.label}
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block text-muted-foreground/80 hover:text-foreground truncate transition-colors">
                      {part.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECTION: Command Search, BCV Rate, Quick Action, Alerts, Theme, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Command Bar Trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/80 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-150 shadow-2xs group cursor-pointer"
            title="Abrir búsqueda global y comandos (Ctrl+K)"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-normal text-muted-foreground/90">Buscar o comando...</span>
            </div>
            <kbd className="flex items-center gap-0.5 rounded border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCommandOpen(true)}
            className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Buscar (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Live BCV Exchange Rate Badge */}
          {Boolean(exchangeRate && exchangeRate > 0) && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/finances/exchange-rates"
                    className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors shadow-2xs"
                  >
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    <span>BCV: Bs. {Number(exchangeRate).toFixed(2)}</span>
                  </Link>
                }
              />
              <TooltipContent side="bottom">
                <div className="text-center">
                  <p className="font-semibold text-xs">Tasa Oficial BCV</p>
                  <p className="text-[10px] text-muted-foreground">Clic para ver historial cambiario</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Quick Action CTA: Nueva Venta */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/sales"
                  className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs font-semibold shadow-xs shadow-primary/20 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Venta</span>
                </Link>
              }
            />
            <TooltipContent side="bottom">
              <span>Nueva Venta / Punto de Venta (Alt+N)</span>
            </TooltipContent>
          </Tooltip>

          {/* Backend Status indicator */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/20 px-2.5 py-1 text-xs">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isBackendHealthy
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    )}
                  />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isBackendHealthy ? "API Online" : "Desconectado"}
                  </span>
                </div>
              }
            />
            <TooltipContent side="bottom">
              <span className="text-xs">
                {isBackendHealthy
                  ? "Servidor backend y base de datos sincronizados"
                  : "Verificando conexión con el backend"}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Notifications Center */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer outline-none"
                  aria-label="Menú de usuario"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-2xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="hidden 2xl:inline-block text-xs font-semibold text-foreground max-w-[100px] truncate">
                    {user?.name || "Usuario"}
                  </span>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-60 p-1.5">
              <DropdownMenuLabel className="font-normal px-2 py-2">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold leading-none text-foreground">
                      {user?.name || "Usuario"}
                    </p>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
                      Admin
                    </Badge>
                  </div>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || "usuario@erp.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShortcutsOpen(true)}
                className="cursor-pointer text-xs"
              >
                <Keyboard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Atajos de Teclado</span>
                <kbd className="ml-auto text-[9px] font-mono text-muted-foreground">
                  ?
                </kbd>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer text-xs"
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Configuración General</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/admin/users")}
                className="cursor-pointer text-xs"
              >
                <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Gestión de Usuarios</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut()}
                className="cursor-pointer text-xs"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Global Command Palette Modal */}
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

        {/* Keyboard Shortcuts Dialog */}
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </header>
    </TooltipProvider>
  );
}
