/**
 * Runtime ortam değişkeni doğrulaması.
 * Zorunlu VITE_* değerleri eksikse uygulama açılışında açık bir hata atar
 * ve kullanıcıya görsel bir uyarı yansıtır (main.tsx tarafında yakalanır).
 */

type EnvKey =
  | "VITE_FIREBASE_API_KEY"
  | "VITE_FIREBASE_AUTH_DOMAIN"
  | "VITE_FIREBASE_PROJECT_ID"
  | "VITE_FIREBASE_STORAGE_BUCKET"
  | "VITE_FIREBASE_MESSAGING_SENDER_ID"
  | "VITE_FIREBASE_APP_ID";

const REQUIRED: EnvKey[] = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export interface AppEnv {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  sentryDsn?: string;
  publicUrl: string;
  isProd: boolean;
}

/** Eksik env'leri toplar ve tek seferde raporlar. */
function validateEnv(): { ok: boolean; missing: EnvKey[] } {
  const missing: EnvKey[] = [];
  for (const key of REQUIRED) {
    const value = import.meta.env[key];
    if (!value || typeof value !== "string" || value.trim() === "") {
      missing.push(key);
    }
  }
  return { ok: missing.length === 0, missing };
}

const validation = validateEnv();

if (!validation.ok) {
  const msg = `Eksik ortam değişkenleri: ${validation.missing.join(", ")}. Lütfen .env dosyanızı kontrol edin.`;
  // Production build'ında fırlatırsak uygulama açılmaz — bilinçli seçim,
  // yanlış yapılandırılmış üretim dağıtımı sessizce çalışmamalı.
  throw new Error(msg);
}

export const env: AppEnv = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
  },
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  publicUrl: import.meta.env.VITE_PUBLIC_URL || "https://oyuncak.app",
  isProd: import.meta.env.PROD,
};
