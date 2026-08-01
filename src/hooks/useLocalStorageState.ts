import { useEffect, useRef, useState } from "react";

/**
 * localStorage backed state.
 * - SSR-safe (window yoksa defaultValue kullanır)
 * - Parse hatalarında sessizce default'a döner
 * - İlk mount'ta default değerle gereksiz yazma yapmaz (sadece kullanıcı set ettiğinde yazar)
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      if (typeof window === "undefined") return defaultValue;
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const prevKeyRef = useRef(key);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(key);
          setValue(raw === null ? defaultValue : (JSON.parse(raw) as T));
        }
      } catch {
        setValue(defaultValue);
      }
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value, defaultValue]);

  return [value, setValue] as const;
}

