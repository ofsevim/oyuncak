/**
 * Hafif i18n altyapısı. Şu an sadece Türkçe; dil eklemek için:
 *
 * 1) `locales` objesine yeni anahtar/dil ekleyin (ör. `en`)
 * 2) Eksik çeviriler `tr` fallback'ine düşer
 * 3) Kullanıcı dili tarayıcıdan okunur veya `setLocale()` ile override edilir
 *
 * Tam refactor için bileşenlerde string yerine `t('key')` kullanın.
 * Mevcut string'ler aşamalı olarak taşınabilir.
 */

import { useSyncExternalStore } from "react";

type Locale = "tr" | "en";

type Dict = Record<string, string>;

const locales: Record<Locale, Dict> = {
  tr: {
    "app.loading": "Yükleniyor...",
    "app.retry": "Tekrar Dene",
    "app.offline": "Çevrimdışısın",
    "error.generic": "Bir şeyler yanlış gitti",
    "error.reassure": "Endişelenme, diğer bölümler çalışmaya devam ediyor.",
    "nav.home": "Ana Sayfa",
    "nav.games": "Oyunlar",
    "nav.draw": "Çizim",
    "nav.story": "Hikayeler",
    "games.heading.main": "Oyun",
    "games.heading.accent": "Merkezi",
    "games.waiting": "oyun seni bekliyor",
    "sound.on": "Sesi aç",
    "sound.off": "Sesi kapat",
    "leaderboard.title": "Liderlik Tablosu",
    "leaderboard.empty": "Henüz skor yok — ilk rekoru sen kır!",
  },
  en: {
    "app.loading": "Loading...",
    "app.retry": "Try Again",
    "app.offline": "You're offline",
    "error.generic": "Something went wrong",
    "error.reassure": "Don't worry, other parts still work.",
    "nav.home": "Home",
    "nav.games": "Games",
    "nav.draw": "Draw",
    "nav.story": "Stories",
    "games.heading.main": "Game",
    "games.heading.accent": "Hub",
    "games.waiting": "games waiting for you",
    "sound.on": "Turn sound on",
    "sound.off": "Turn sound off",
    "leaderboard.title": "Leaderboard",
    "leaderboard.empty": "No scores yet — be the first!",
  },
};

const LOCALE_KEY = "oyuncak.locale";

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "tr" || stored === "en") return stored;
  } catch {
    /* yut */
  }
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.slice(0, 2).toLowerCase();
    if (lang === "en") return "en";
  }
  return "tr";
}

let currentLocale: Locale = detectLocale();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* yut */
  }
  listeners.forEach((cb) => cb());
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, fallback?: string): string {
  return (
    locales[currentLocale]?.[key] ??
    locales.tr[key] ??
    fallback ??
    key
  );
}

/** React hook — locale değişince bileşeni yeniden render eder */
export function useLocale() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Hook olarak t — locale değişimi ile senkron */
export function useT() {
  useLocale();
  return t;
}
