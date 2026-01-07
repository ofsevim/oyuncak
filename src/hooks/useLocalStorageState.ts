import { useEffect, useState } from "react";

/**
 * localStorage backed state.
 * - SSR-safe (window yoksa defaultValue kullanır)
 * - Parse hatalarında sessizce default'a döner
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      if (typeof window === "undefined") return defaultValue;
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}


