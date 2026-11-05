"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig, type NavGroup, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import {
  LogOut,
  Store,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  ChevronsUpDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  onItemClick?: () => void;
  forceExpanded?: boolean;
}

export function AppSidebar({ onItemClick, forceExpanded = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const {
    isCollapsed: contextCollapsed,
    toggleSidebar,
    isGroupCollapsed,
    toggleGroup,
    collapseAllGroups,
    expandAllGroups,
    collapsedGroups,
    searchQuery,
    setSearchQuery,
  } = useSidebar();

  // If forceExpanded is true (e.g. mobile drawer), ignore collapsed state
  const isCollapsed = forceExpanded ? false : contextCollapsed;

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navigationConfig;

    return navigationConfig
      .map((group) => {
        const matchingItems = group.items.filter((item) => {
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchModule = item.module?.toLowerCase().includes(q);
          const matchKeywords = item.keywords?.some((k) =>
            k.toLowerCase().includes(q)
          );
          return matchTitle || matchModule || matchKeywords;
        });

        // Also check if group title itself matches
        if (group.groupTitle.toLowerCase().includes(q)) {
          return group;
        }

        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  // Determine if all groups are currently collapsed
  const areAllGroupsCollapsed = useMemo(() => {
    return navigationConfig.every((g) => collapsedGroups[g.groupTitle]);
  }, [collapsedGroups]);

  const toggleAllGroups = () => {
    if (areAllGroupsCollapsed) {
      expandAllGroups();
    } else {
      collapseAllGroups();
    }
  };

  return (
    <TooltipProvider delay={150}>
      <aside
        className={cn(
          "flex h-full w-full flex-col bg-card text-card-foreground select-none overflow-hidden",
          isCollapsed ? "items-center" : ""
        )}
      >
        {/* BRAND HEADER */}
        <div
          className={cn(
            "flex h-16 w-full items-center border-b border-border/80 px-3.5 transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggleSidebar}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs hover:opacity-90 transition-transform active:scale-95"
                    aria-label="Desplegar barra lateral"
                  >
                    <Store className="h-5 w-5" />
                  </button>
                }
              />
              <TooltipContent side="right">
                <span className="font-semibold">CASA ERP</span>
                <p className="text-[11px] text-muted-foreground">Clic para desplegar (Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Store className="h-5 w-5" />
                </div>
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-foreground">
                      CASA ERP
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    Gestión & Streaming
                  </span>
                </div>
              </div>

              {!forceExpanded && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  title="Ocultar barra lateral (Ctrl+B)"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* SEARCH & CONTROLS (Expanded Only) */}
        {!isCollapsed && (
          <div className="border-b border-border/60 p-2.5 space-y-2 bg-muted/20">
            {/* Quick Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar módulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-border/80 bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
                  title="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Accordion Global Toggle */}
            {!searchQuery && (
              <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                <span className="font-medium tracking-wide">Navegación</span>
                <button
                  onClick={toggleAllGroups}
                  className="flex items-center gap-1 hover:text-foreground text-[10px] font-medium py-0.5 px-1.5 rounded hover:bg-muted/60 transition-colors"
                  title={areAllGroupsCollapsed ? "Desplegar todos los módulos" : "Guardar todos los módulos"}
                >
                  <ChevronsUpDown className="h-3 w-3" />
                  <span>{areAllGroupsCollapsed ? "Desplegar todos" : "Guardar todos"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* NAVIGATION CONTENT */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-3",
            isCollapsed ? "w-full px-2 space-y-2" : "px-3 space-y-4"
          )}
        >
          {filteredGroups.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                No se encontraron módulos con &ldquo;{searchQuery}&rdquo;.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs"
              >
                Limpiar filtro
              </Button>
            </div>
          ) : (
            filteredGroups.map((group, groupIndex) => {
              // Group is collapsed if user toggled it and no active search
              const isGroupClosed = !isCollapsed && isGroupCollapsed(group.groupTitle);

              // Check if any child item is active
              const hasActiveChild = group.items.some(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
              );

              return (
                <div key={group.groupTitle} className="space-y-1">
                  {/* COLLAPSED MODE: Thin divider between groups */}
                  {isCollapsed ? (
                    <>
                      {groupIndex > 0 && (
                        <div className="my-2 h-px w-6 mx-auto bg-border/60" />
                      )}
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));
                          const Icon = item.icon;

                          return (
                            <Tooltip key={item.href}>
                              <TooltipTrigger
                                render={
                                  <Link
                                    href={item.href}
                                    onClick={onItemClick}
                                    className={cn(
                                      "flex h-10 w-10 items-center justify-center rounded-lg transition-all mx-auto",
                                      isActive
                                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                    )}
                                    aria-label={item.title}
                                  >
                                    <Icon className="h-5 w-5 shrink-0" />
                                  </Link>
                                }
                              />
                              <TooltipContent side="right" sideOffset={12}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-xs">{item.title}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {group.groupTitle}
                                  </span>
                                  {item.badge && (
                                    <Badge variant="secondary" className="mt-1 w-fit text-[9px] px-1 py-0">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    /* EXPANDED MODE: Collapsible Group Accordion */
                    <>
                      {/* Group Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.groupTitle)}
                        className={cn(
                          "group/header flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all cursor-pointer",
                          hasActiveChild && "text-foreground font-bold"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{group.groupTitle}</span>
                          <span className="text-[10px] font-normal text-muted-foreground/60 px-1 py-0 rounded bg-muted/40">
                            {group.items.length}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground/60 group-hover/header:text-foreground transition-transform duration-200",
                            isGroupClosed && "-rotate-90"
                          )}
                        />
                      </button>

                      {/* Group Items List */}
                      {!isGroupClosed && (
                        <div className="space-y-0.5 pt-0.5 pl-1 transition-all">
                          {group.items.map((item) => {
                            const isActive =
                              pathname === item.href ||
                              (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            const Icon = item.icon;

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={onItemClick}
                                className={cn(
                                  "group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon
                                    className={cn(
                                      "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                                      isActive
                                        ? "text-primary-foreground"
                                        : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                  />
                                  <span className="truncate text-xs font-medium">
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {item.badge && (
                                    <Badge
                                      variant={isActive ? "secondary" : "outline"}
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                  {isActive && (
                                    <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* SIDEBAR FOOTER */}
        <div
          className={cn(
            "border-t border-border/80 bg-muted/20 transition-all duration-300",
            isCollapsed ? "p-2 w-full flex flex-col items-center gap-2" : "p-3 space-y-2"
          )}
        >
          {isCollapsed ? (
            /* COLLAPSED FOOTER: Avatar with Dropdown */
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-1 ring-primary/20 hover:ring-primary transition-all"
                      aria-label="Perfil de usuario"
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </button>
                  }
                />
                <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold">{user?.name || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || "sesión activa"}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => signOut()}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={toggleSidebar}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label="Desplegar menú lateral (Ctrl+B)"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  }
                />
                <TooltipContent side="right">
                  <span className="text-xs">Desplegar menú lateral (Ctrl+B)</span>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            /* EXPANDED FOOTER: User Card & Quick Controls */
            <>
              <div className="flex items-center justify-between rounded-xl bg-card border border-border/60 p-2 shadow-2xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {user?.name || "Usuario"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {user?.email || "sesión activa"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Cerrar sesión"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Keyboard Shortcut Hint */}
              <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground/70">
                <span>Atajo rápido:</span>
                <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  Ctrl + B
                </kbd>
              </div>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
