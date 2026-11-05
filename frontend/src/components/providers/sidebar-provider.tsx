"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { navigationConfig } from "@/config/navigation";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (groupTitle: string) => void;
  isGroupCollapsed: (groupTitle: string) => boolean;
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_COLLAPSED_KEY = "casa_sidebar_collapsed";
const STORAGE_GROUPS_KEY = "casa_collapsed_groups";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Hydrate preferences from localStorage safely on client
  useEffect(() => {
    setIsMounted(true);
    try {
      const storedCollapsed = localStorage.getItem(STORAGE_COLLAPSED_KEY);
      if (storedCollapsed !== null) {
        setIsCollapsed(storedCollapsed === "true");
      }

      const storedGroups = localStorage.getItem(STORAGE_GROUPS_KEY);
      if (storedGroups) {
        setCollapsedGroups(JSON.parse(storedGroups));
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleGroup = useCallback((groupTitle: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupTitle]: !prev[groupTitle] };
      try {
        localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  const isGroupCollapsed = useCallback(
    (groupTitle: string) => {
      // If user is actively searching, never collapse matching groups
      if (searchQuery.trim().length > 0) return false;
      return Boolean(collapsedGroups[groupTitle]);
    },
    [collapsedGroups, searchQuery]
  );

  const collapseAllGroups = useCallback(() => {
    const allCollapsed: Record<string, boolean> = {};
    navigationConfig.forEach((g) => {
      allCollapsed[g.groupTitle] = true;
    });
    setCollapsedGroups(allCollapsed);
    try {
      localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(allCollapsed));
    } catch {
      // Ignore storage error
    }
  }, []);

  const expandAllGroups = useCallback(() => {
    setCollapsedGroups({});
    try {
      localStorage.removeItem(STORAGE_GROUPS_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  // Keyboard shortcut listener: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        // Avoid overriding browser shortcuts when in input fields if user is typing
        const target = e.target as HTMLElement | null;
        const isInputField =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable;

        if (!isInputField) {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const value = useMemo(
    () => ({
      isCollapsed,
      toggleSidebar,
      setCollapsed,
      collapsedGroups,
      toggleGroup,
      isGroupCollapsed,
      collapseAllGroups,
      expandAllGroups,
      searchQuery,
      setSearchQuery,
    }),
    [
      isCollapsed,
      toggleSidebar,
      setCollapsed,
      collapsedGroups,
      toggleGroup,
      isGroupCollapsed,
      collapseAllGroups,
      expandAllGroups,
      searchQuery,
      setSearchQuery,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
