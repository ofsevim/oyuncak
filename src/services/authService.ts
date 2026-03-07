import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

let currentUser: User | null = null;
let authPromise: Promise<User> | null = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

/**
 * Anonim oturum aç (veya mevcut oturumu kullan).
 * Aynı anda birden fazla çağrılırsa tek promise paylaşır.
 */
export function ensureAuth(): Promise<User> {
  if (currentUser) return Promise.resolve(currentUser);

  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => {
        currentUser = cred.user;
        authPromise = null;
        return cred.user;
      })
      .catch((err) => {
        authPromise = null;
        console.warn('[Oyuncak] Anonim giriş hatası:', err);
        throw err;
      });
  }

  return authPromise;
}

/** Senkron UID getter — auth henüz hazır değilse null döner */
export function getUid(): string | null {
  return currentUser?.uid ?? null;
}
