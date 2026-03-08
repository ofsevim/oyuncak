import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

let currentUser: User | null = null;
let authPromise: Promise<User> | null = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/** 8 saniyelik timeout ile promise yarışı */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('auth-timeout')), ms)
    ),
  ]);
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
          console.warn('[Oyuncak] Anonim giriş hatası:', err);
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
