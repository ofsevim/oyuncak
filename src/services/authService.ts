import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

let currentUser: User | null = null;
let authPromise: Promise<User> | null = null;

const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

export { unsubscribeAuth };

/** 8 saniyelik timeout ile promise yarışı; timer sızıntısını önlemek için finally'de temizlenir */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('auth-timeout')), ms);
  });
  return Promise.race([p, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Anonim oturum aç (veya mevcut oturumu kullan).
 * Aynı anda birden fazla çağrılırsa tek promise paylaşır.
 * Yavaş ağda 8 saniye sonra timeout atar, uygulama yine de çalışır.
 */
export function ensureAuth(): Promise<User> {
  if (currentUser) return Promise.resolve(currentUser);

  if (!authPromise) {
    authPromise = withTimeout(signInAnonymously(auth), 8000)
      .then((cred) => {
        currentUser = cred.user;
        authPromise = null;
        return cred.user;
      })
      .catch((err) => {
        authPromise = null;
        if (err?.message !== 'auth-timeout') {
          logger.warn('Anonim giriş hatası', { err: String(err) });
        }
        throw err;
      });
  }

  return authPromise;
}

/** Senkron UID getter — auth henüz hazır değilse null döner */
export function getUid(): string | null {
  return currentUser?.uid ?? null;
}
