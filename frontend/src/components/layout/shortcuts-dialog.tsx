"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Command, Sparkles } from "lucide-react";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  {
    keys: ["Ctrl", "K"],
    description: "Abrir Búsqueda Global y Paleta de Comandos",
    category: "Navegación",
  },
  {
    keys: ["Ctrl", "B"],
    description: "Guardar o Desplegar la Barra Lateral (Sidebar)",
    category: "Interfaz",
  },
  {
    keys: ["Esc"],
    description: "Cerrar modales, paneles emergentes y diálogos",
    category: "General",
  },
  {
    keys: ["Alt", "N"],
    description: "Acceso directo a Nueva Venta (Punto de Venta POS)",
    category: "Accesos Rápidos",
  },
  {
    keys: ["Alt", "D"],
    description: "Ir al Dashboard principal y métricas ejecutivas",
    category: "Accesos Rápidos",
  },
  {
    keys: ["Alt", "I"],
    description: "Ir al Módulo de Almacenes e Inventario",
    category: "Accesos Rápidos",
  },
  {
    keys: ["Alt", "S"],
    description: "Ir al Módulo de Cuentas y Perfiles Streaming",
    category: "Accesos Rápidos",
  },
];

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border border-border/80 bg-card shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Keyboard className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Atajos de Teclado del Sistema
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Optimiza tu velocidad de trabajo en CASA ERP con estos atajos de productividad.
          </p>
        </DialogHeader>

        <div className="divide-y divide-border/60 mt-4 max-h-80 overflow-y-auto">
          {SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/40 rounded-lg transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">
                  {shortcut.description}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {shortcut.category}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-border/80 bg-muted/60 px-2 py-1 font-mono text-[11px] font-semibold text-foreground shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Compatible con Windows, Mac (Cmd) y Linux</span>
          <kbd className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 font-mono">
            ESC para cerrar
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
