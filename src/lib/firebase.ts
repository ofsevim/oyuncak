import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { env } from './env';

/**
 * Firebase client config — değerler env.ts içinde doğrulanmış .env dosyasından gelir.
 * Güvenlik Firestore security rules ile sağlanır.
 */
const app = initializeApp(env.firebase);

export const auth = getAuth(app);
export const db = getFirestore(app);

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
export default app;
