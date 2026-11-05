import { useEffect, useState } from "react";

/**
 * Hook para aplicar un retraso (debounce) a un valor cambiante,
 * evitando llamadas a la API o cómputos en cada pulsación de tecla.
 *
 * @param value Valor reactivo a retrasar (ej. string de búsqueda)
 * @param delay Tiempo de espera en milisegundos (por defecto 400ms)
 * @returns El valor retrasado
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
