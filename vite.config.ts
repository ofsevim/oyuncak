import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import legacy from "@vitejs/plugin-legacy";

/**
 * Build sonrası dist/assets içindeki hash'li JS/CSS/font dosyalarını tarayıp
 * dist/precache-manifest.json üretir. Service Worker bunu install aşamasında
 * okuyup tüm uygulama asset'lerini önbelleğe alır → ilk açılıştan sonra tam offline.
 */
function precacheManifestPlugin(): Plugin {
  return {
    name: "precache-manifest",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const assetsDir = path.join(distDir, "assets");
      if (!fs.existsSync(assetsDir)) return;

      const assets = fs
        .readdirSync(assetsDir)
        .filter((f) => /\.(js|css|woff2?)$/.test(f))
        // Legacy/polyfill chunk'ları hariç tut: modern tarayıcılar kullanmaz,
        // eski tarayıcılar stale-while-revalidate ile yüklenir → install boyutu yarıya iner
        .filter((f) => !/-legacy-|polyfills/.test(f))
        .map((f) => `/assets/${f}`)
        .sort();

      fs.writeFileSync(
        path.join(distDir, "precache-manifest.json"),
        JSON.stringify({ assets }),
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    cssTarget: "chrome61",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "router-vendor";
          }

          if (
            id.includes("react-dom") ||
            id.includes("scheduler") ||
            /node_modules[\\/](react)[\\/]/.test(id)
          ) {
            return "react-vendor";
          }

          if (id.includes("framer-motion")) {
            return "motion-vendor";
          }

          if (id.includes("lucide-react")) {
            return "icons-vendor";
          }

          if (id.includes("@radix-ui")) {
            return "radix-vendor";
          }

          if (id.includes("firebase/auth") || id.includes("@firebase/auth")) {
            return "firebase-auth";
          }

          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
            return "firebase-firestore";
          }

          if (id.includes("firebase/app") || id.includes("@firebase/app")) {
            return "firebase-app";
          }

          if (id.includes("firebase")) {
            return "firebase-vendor";
          }

          if (id.includes("fabric")) {
            return "drawing-vendor";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    precacheManifestPlugin(),
    legacy({
      targets: [
        "defaults",
        "not IE 11",
        "Safari >= 11",
        "iOS >= 11",
        "Chrome >= 61",
        "Firefox >= 60",
        "Edge >= 16",
        "Samsung >= 8",
        "Android >= 5",
        "UCAndroid >= 12.12",
        "OperaMini all",
      ],
      // Modern tarayıcılar (ESM destekli — Chrome 61+, Safari 11+) zaten gerekli
      // çoğu özelliği destekler; bunlara polyfill yüklemeyiz. Eski tarayıcılar
      // ayrı -legacy bundle + Babel polyfill'leriyle çalışmaya devam eder.
      modernPolyfills: false,
      additionalLegacyPolyfills: [
        "regenerator-runtime/runtime",
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
