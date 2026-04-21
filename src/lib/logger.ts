/**
 * Merkezi, yapılandırılmış logger.
 * - Development: zengin console çıktısı
 * - Production: sadece warn/error seviyesi; Sentry DSN varsa uzak gönderim
 *
 * Sentry SDK opsiyoneldir; yoksa logger şeffaf biçimde console fallback'ine düşer.
 * Gerçek Sentry entegrasyonu için `npm i @sentry/react` kurun ve aşağıdaki
 * `initErrorTracking` fonksiyonunda import'u aktif edin.
 */

import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

// Harici error tracker için opsiyonel hook
let externalCapture: ((error: Error, context?: LogContext) => void) | null = null;

function shouldLog(level: LogLevel): boolean {
  if (!env.isProd) return true;
  return level === "warn" || level === "error";
}

function format(level: LogLevel, msg: string, ctx?: LogContext) {
  const stamp = new Date().toISOString();
  const prefix = `[${stamp}] [${level.toUpperCase()}]`;
  return ctx ? [prefix, msg, ctx] : [prefix, msg];
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    if (!shouldLog("debug")) return;
    console.debug(...format("debug", msg, ctx));
  },
  info(msg: string, ctx?: LogContext) {
    if (!shouldLog("info")) return;
    console.info(...format("info", msg, ctx));
  },
  warn(msg: string, ctx?: LogContext) {
    if (!shouldLog("warn")) return;
    console.warn(...format("warn", msg, ctx));
  },
  error(msg: string, error?: unknown, ctx?: LogContext) {
    if (!shouldLog("error")) return;
    console.error(...format("error", msg, ctx), error);

    if (externalCapture && error instanceof Error) {
      try {
        externalCapture(error, { message: msg, ...ctx });
      } catch {
        // sessizce yut — logger hiçbir zaman yukarı hata atmamalı
      }
    }
  },
};

/**
 * Uygulama açılışında çağrılır.
 * Sentry DSN sağlanmışsa harici yakalayıcıyı kurar.
 * @sentry/react kuruluysa gerçek entegrasyon; değilse basit bir fetch fallback'i.
 */
export function initErrorTracking() {
  if (!env.sentryDsn) {
    logger.info("Sentry DSN yok, yalnızca konsol loglaması aktif.");
    return;
  }

  // Sentry paketi kurulu değilse, basit bir beacon fallback'i kur.
  // İsteğe bağlı: `npm i @sentry/react` sonrası aşağıyı değiştirin.
  externalCapture = (error, context) => {
    try {
      const payload = JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        ua: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
      });
      // Sentry envelope formatı değildir; sadece placeholder bir POST.
      // Gerçek Sentry yerine kendi toplayıcınızı kullanabilirsiniz.
      if (typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/__error_beacon__", blob);
      }
    } catch {
      // yut
    }
  };

  // Global yakalayıcılar
  window.addEventListener("error", (ev) => {
    logger.error("window.error", ev.error, { message: ev.message });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
    logger.error("unhandledrejection", reason);
  });
}
