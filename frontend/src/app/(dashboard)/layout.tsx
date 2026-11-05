"use client";

import React, { useEffect, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { SidebarProvider, useSidebar } from "@/components/providers/sidebar-provider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();
  const router = useRouter();
  const isRedirecting = useRef(false);

  useEffect(() => {
    if (!isLoading && !user && !isRedirecting.current) {
      isRedirecting.current = true;
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Loading Overlay si la sesión aún se está verificando */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Cargando entorno CASA ERP...
            </p>
          </div>
        </div>
      )}

      {/* Desktop Sidebar with smooth collapse/expand width transition */}
      <div
        className={cn(
          "hidden md:flex md:flex-col shrink-0 border-r border-border bg-card transition-[width] duration-300 ease-in-out overflow-hidden z-20",
          isCollapsed ? "md:w-[72px]" : "md:w-64"
        )}
      >
        <AppSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-3 sm:p-5 lg:p-6 transition-all duration-300">
          <div className="w-full min-w-0 space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
