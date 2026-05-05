/**
 * Merkezi, yapılandırılmış logger.
 * - Development: zengin console çıktısı
 * - Production: sadece warn/error seviyesi
 *
 * Harici hata izleme için `setExternalCapture()` ile bir yakalayıcı kaydedilebilir
 * (örn. Sentry: `setExternalCapture(Sentry.captureException)`).
 */

import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

type ExternalCapture = (error: Error, context?: LogContext) => void;

let externalCapture: ExternalCapture | null = null;

export function setExternalCapture(fn: ExternalCapture | null) {
  externalCapture = fn;
}

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
 * Şu an sadece global hata yakalayıcılarını bağlar ve konsola yazar.
 *
 * Gerçek hata izleme istenirse:
 *   1) `npm i @sentry/react`
 *   2) Buradan `Sentry.init({ dsn: env.sentryDsn })` çağırın
 *   3) `externalCapture = Sentry.captureException` olarak ayarlayın
 */
export function initErrorTracking() {
  if (!env.sentryDsn) {
    logger.info("Sentry DSN yok, yalnızca konsol loglaması aktif.");
  } else {
    logger.info("Sentry DSN tanımlı; gerçek entegrasyon için @sentry/react kurulmalı.");
  }

  // Global yakalayıcılar — DSN olsun olmasın hataları konsola yansıt.
  window.addEventListener("error", (ev) => {
    logger.error("window.error", ev.error, { message: ev.message });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
    logger.error("unhandledrejection", reason);
  });
}
