import { useState, useEffect } from "react";

/**
 * Hook para manejar estado persistente en sessionStorage.
 * @param {string} key - Clave bajo la cual se guardará en sessionStorage.
 * @param {any} initialValue - Valor inicial si no hay nada guardado.
 * @returns {[any, function]} - Retorna el estado y la función para actualizarlo.
 */
export function usePersistedState(key, initialValue) {
  // Inicialización perezosa: lee de sessionStorage al inicio
  const [state, setState] = useState(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null && typeof initialValue === "object" && initialValue !== null) {
            return { ...initialValue, ...parsed };
        }
        return parsed;
      } catch (e) {
        console.error(`Error parsing sessionStorage key "${key}":`, e);
      }
    }
    return initialValue;
  });

  // Guardar en sessionStorage cada vez que el estado cambie
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}
