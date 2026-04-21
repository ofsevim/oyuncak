import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorTracking, logger } from "./lib/logger";

declare global {
  interface Window {
    __appLoadTimer?: number;
  }
}

/**
 * Env doğrulaması başarısız olursa (firebase.ts veya env.ts içinde fırlatılır),
 * kullanıcıya sessiz bir boş ekran göstermek yerine net bir hata göster.
 */
function showFatalError(message: string) {
  const loader = document.getElementById("app-loader");
  const html = `
    <div style="padding:2rem;text-align:center;max-width:480px;margin:0 auto;color:#ff6b6b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
      <h1 style="font-size:1.25rem;color:#fff;margin-bottom:0.75rem">Yapılandırma Hatası</h1>
      <p style="font-size:0.9rem;color:#cbd5e1;line-height:1.6">${message}</p>
    </div>
  `;
  if (loader) loader.innerHTML = html;
  else document.body.innerHTML = html;
}

async function bootstrap() {
  try {
    initErrorTracking();

    if (window.__appLoadTimer) {
      clearTimeout(window.__appLoadTimer);
    }

    const loader = document.getElementById("app-loader");
    if (loader) loader.remove();

    createRoot(document.getElementById("root")!).render(<App />);
    warmFirebaseInBackground();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .catch((err) => logger.warn("Service worker register failed", { err: String(err) }));
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen başlatma hatası";
    showFatalError(msg);
    logger.error("Bootstrap failed", err);
  }
}

function warmFirebaseInBackground() {
  window.setTimeout(async () => {
    try {
      const [{ ensureAuth }, { syncExistingScores }] = await Promise.all([
        import("@/services/authService"),
        import("@/utils/highScores"),
      ]);

      await ensureAuth();
      await syncExistingScores();
    } catch (err) {
      logger.warn("Firebase warm-up failed", { err: String(err) });
    }
  }, 1200);
}

bootstrap();
