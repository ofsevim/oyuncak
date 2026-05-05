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

  // İlk render'da yazma — sadece state değişikliklerinde sync et
  const isFirstRender = useRef(true);

  useEffect(() => {
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
  }, [key, value]);

  return [value, setValue] as const;
}

