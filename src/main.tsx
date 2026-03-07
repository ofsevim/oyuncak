import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureAuth } from "@/services/authService";
import { syncExistingScores } from "@/utils/highScores";

// Global window property for the app load timer
declare global {
  interface Window { __appLoadTimer?: number }
}

// Yükleme tamamlandı: spinner ve timeout temizle
if (window.__appLoadTimer) clearTimeout(window.__appLoadTimer);
const loader = document.getElementById("app-loader");
if (loader) loader.remove();

// Anonim auth + mevcut rekorları Firebase'e aktar
ensureAuth().then(() => syncExistingScores()).catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => {/* SW Registered */})
            .catch(() => {/* SW Registration Failed */});
    });
}

