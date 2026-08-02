import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { env } from './env';

/**
 * Firebase client config — değerler env.ts içinde doğrulanmış .env dosyasından gelir.
 * Güvenlik Firestore security rules ile sağlanır.
 */
const app = initializeApp(env.firebase);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
export default app;
