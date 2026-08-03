import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initErrorTracking, logger } from "./lib/logger";
import { SERVICE_WORKER_UPDATE_EVENT, watchForServiceWorkerUpdate } from "./utils/serviceWorkerUpdate";

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
  const container = document.createElement("div");
  container.style.cssText = "padding:2rem;text-align:center;max-width:480px;margin:0 auto;color:#ff6b6b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  const icon = document.createElement("div");
  icon.style.cssText = "font-size:3rem;margin-bottom:1rem";
  icon.textContent = "⚠️";
  const title = document.createElement("h1");
  title.style.cssText = "font-size:1.25rem;color:#fff;margin-bottom:0.75rem";
  title.textContent = "Yapılandırma Hatası";
  const detail = document.createElement("p");
  detail.style.cssText = "font-size:0.9rem;color:#cbd5e1;line-height:1.6";
  detail.textContent = message;
  container.append(icon, title, detail);

  (loader ?? document.body).replaceChildren(container);
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
          .register(`${import.meta.env.BASE_URL}sw.js`, {
            // SW dosyasını her zaman ağdan çek, HTTP cache'i bypass et
            updateViaCache: "none",
          })
          .then((registration) => {
            watchForServiceWorkerUpdate(
              registration,
              () => Boolean(navigator.serviceWorker.controller),
              () => window.dispatchEvent(new Event(SERVICE_WORKER_UPDATE_EVENT)),
            );
            // Her 30 dakikada bir güncelleme kontrolü yap
            setInterval(() => registration.update(), 30 * 60 * 1000);
          })
          .catch((err) => logger.warn("Service worker register failed", { err: String(err) }));

        // Kullanıcı güncellemeyi onaylayınca yeni worker kontrolü alır.
        let reloading = false;
        let hadController = Boolean(navigator.serviceWorker.controller);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!hadController) {
            hadController = true;
            return;
          }
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
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
