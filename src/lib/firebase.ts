import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase client config — bu değerler client-side public bilgidir,
 * güvenlik Firestore security rules ile sağlanır.
 * .env yoksa sabit değerlere fallback yapılır.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyC3TpwB1IzynJuQTnQMn1_h-anFwyB9zlg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'oyuncak-3718e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'oyuncak-3718e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'oyuncak-3718e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '646510168849',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:646510168849:web:0fb5e61708419be1f55ab0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-BG4WC1RBTG',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
