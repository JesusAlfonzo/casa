import { useSyncExternalStore } from "react";

export { cn } from "cn";

let cachedNow = typeof window !== "undefined" ? Date.now() : 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  // Actualizar la marca de tiempo cada 60 segundos de forma controlada
  setInterval(() => {
    cachedNow = Date.now();
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignorar errores de listeners desmontados
      }
    });
  }, 60000);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): number {
  return cachedNow;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Hook seguro y de alto rendimiento para obtener la fecha/hora actual en cliente.
 * Retorna un valor estable en cada render para prevenir bucles infinitos
 * ("Maximum update depth exceeded") y es compatible con el prerender de Next.js 16.
 */
export function useClientNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
