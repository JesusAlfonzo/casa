"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { navigationConfig } from "@/config/navigation";
import {
  Search,
  ShoppingCart,
  Package,
  Tv,
  Landmark,
  ArrowRight,
  TrendingUp,
  FileText,
  Users,
  Building2,
  BadgeDollarSign,
  Layers,
  Warehouse,
  ShieldCheck,
  UserCog,
  Truck,
  MonitorPlay,
  CreditCard,
  Receipt,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Páginas & Módulos" | "Acciones Rápidas";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_ACTIONS: CommandItem[] = [
  {
    id: "action-new-sale",
    title: "Nueva Venta / Punto de Venta (POS)",
    subtitle: "Abrir terminal de caja y procesar venta",
    category: "Acciones Rápidas",
    href: "/sales",
    icon: ShoppingCart,
    keywords: ["vender", "caja", "cobro", "ticket", "facturar"],
    badge: "Frecuente",
  },
  {
    id: "action-manage-streaming",
    title: "Control de Cuentas Streaming",
    subtitle: "Monitorear perfiles y renovaciones a vencer",
    category: "Acciones Rápidas",
    href: "/streaming",
    icon: Tv,
    keywords: ["netflix", "disney", "max", "perfiles", "vencimientos"],
    badge: "Servicios",
  },
  {
    id: "action-check-inventory",
    title: "Consultar Stock de Almacén",
    subtitle: "Ver niveles de existencias y alertas de inventario",
    category: "Acciones Rápidas",
    href: "/inventory",
    icon: Warehouse,
    keywords: ["existencias", "stock", "almacenes", "cantidades"],
  },
  {
    id: "action-exchange-rates",
    title: "Actualizar Tasa Oficial BCV",
    subtitle: "Consultar o ajustar paridad cambiaria USD/VES",
    category: "Acciones Rápidas",
    href: "/finances/exchange-rates",
    icon: BadgeDollarSign,
    keywords: ["dolar", "bcv", "precio", "bolivares", "tasa"],
  },
  {
    id: "action-purchases",
    title: "Registrar Compra a Proveedor",
    subtitle: "Ingresar mercancía y actualizar costes",
    category: "Acciones Rápidas",
    href: "/purchases",
    icon: Truck,
    keywords: ["compra", "proveedor", "adquisicion", "orden"],
  },
  {
    id: "action-reports",
    title: "Generar Reportes & Auditoría",
    subtitle: "Exportar métricas consolidadas en Excel/PDF",
    category: "Acciones Rápidas",
    href: "/reports",
    icon: FileText,
    keywords: ["estadisticas", "ventas", "auditoria", "exportar"],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract navigation pages
  const navItems = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    navigationConfig.forEach((group) => {
      group.items.forEach((item) => {
        list.push({
          id: `nav-${item.href}`,
          title: item.title,
          subtitle: group.groupTitle,
          category: "Páginas & Módulos",
          href: item.href,
          icon: item.icon,
          keywords: item.keywords,
          badge: item.badge,
        });
      });
    });
    return list;
  }, []);

  // Filter combined list
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...QUICK_ACTIONS, ...navItems];

    if (!q) return all;

    return all.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle?.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) =>
        k.toLowerCase().includes(q)
      );
      return matchTitle || matchSub || matchCat || matchKeywords;
    });
  }, [query, navItems]);

  // Reset selected index when filtered list changes or query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleSelect = (item: CommandItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl backdrop-blur-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Búsqueda Global y Comandos</DialogTitle>
        </DialogHeader>

        {/* Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/80 px-4 py-3 bg-muted/20">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe para buscar módulos, páginas o acciones..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC para salir
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-foreground">
                No se encontraron resultados
              </p>
              <p className="text-xs text-muted-foreground">
                Intenta buscar con otro término como &ldquo;ventas&rdquo;, &ldquo;streaming&rdquo; o &ldquo;bcv&rdquo;.
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const currentIndex = filteredItems.findIndex(
                      (i) => i.id === item.id
                    );
                    const isSelected = currentIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                            : "text-foreground hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col truncate">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate",
                                isSelected ? "text-primary-foreground" : "text-foreground"
                              )}
                            >
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span
                                className={cn(
                                  "text-[11px] truncate",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge
                              variant={isSelected ? "secondary" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <ArrowRight
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              isSelected
                                ? "text-primary-foreground translate-x-0.5"
                                : "text-muted-foreground/40 opacity-0"
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-border/80 bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                ↑
              </kbd>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                ↓
              </kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                ↵
              </kbd>
              <span>Seleccionar</span>
            </span>
          </div>

          <span className="text-[10px] text-muted-foreground/70">
            CASA ERP • Búsqueda Rápida
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
