import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import legacy from "@vitejs/plugin-legacy";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    // Eski cihazlar için ES2015 hedefi
    target: "es2015",
    // CSS uyumluluğu
    cssTarget: "chrome61",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
      // Core-js polyfill'leri otomatik ekle
      modernPolyfills: true,
      // Eski tarayıcılar için ek polyfill'ler
      additionalLegacyPolyfills: [
        "regenerator-runtime/runtime",
      ],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
