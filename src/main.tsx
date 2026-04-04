import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    __appLoadTimer?: number;
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
    } catch {
      // Firebase work is best-effort; initial render should stay responsive.
    }
  }, 1200);
}

if (window.__appLoadTimer) {
  clearTimeout(window.__appLoadTimer);
}

const loader = document.getElementById("app-loader");
if (loader) {
  loader.remove();
}

createRoot(document.getElementById("root")!).render(<App />);
warmFirebaseInBackground();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => {
        // SW registered
      })
      .catch(() => {
        // SW registration failed
      });
  });
}
