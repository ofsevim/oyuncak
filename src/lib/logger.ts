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
 * CDN/script ile yüklenen Sentry (global `window.Sentry`) için minimal arayüz.
 * Bundle'a bağımlılık eklemeden opsiyonel entegrasyona izin verir.
 */
interface SentryGlobal {
  init?: (opts: { dsn: string }) => void;
  captureException?: (error: unknown, context?: unknown) => void;
}

/**
 * Sentry entegrasyonunu dener. İki yol desteklenir:
 *   A) CDN: index.html'e Sentry browser SDK script'i eklenir → `window.Sentry` otomatik bağlanır.
 *   B) npm: `npm i @sentry/react` sonrası burada init edip `setExternalCapture` çağırın.
 * Hiçbiri yoksa sessizce konsol loglamasına düşer.
 */
function tryWireSentry(dsn: string): boolean {
  const sentry = (window as unknown as { Sentry?: SentryGlobal }).Sentry;
  if (!sentry?.captureException) return false;
  try {
    sentry.init?.({ dsn });
    setExternalCapture((error, context) => sentry.captureException?.(error, { extra: context }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Uygulama açılışında çağrılır.
 * Global hata yakalayıcılarını bağlar ve (varsa) Sentry'yi otomatik etkinleştirir.
 */
export function initErrorTracking() {
  if (!env.sentryDsn) {
    logger.info("Sentry DSN yok, yalnızca konsol loglaması aktif.");
  } else if (tryWireSentry(env.sentryDsn)) {
    logger.info("Sentry etkin — hatalar harici servise gönderilecek.");
  } else {
    logger.info("Sentry DSN tanımlı ama SDK bulunamadı; yalnızca konsol loglaması aktif.");
  }

  // Global yakalayıcılar — DSN olsun olmasın hataları konsola (ve varsa Sentry'ye) yansıt.
  window.addEventListener("error", (ev) => {
    logger.error("window.error", ev.error, { message: ev.message });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
    logger.error("unhandledrejection", reason);
  });
}
