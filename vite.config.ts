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
    cssTarget: "chrome61",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("firebase/auth") || id.includes("@firebase/auth")) {
            return "firebase-auth";
          }

          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
            return "firebase-firestore";
          }

          if (id.includes("firebase/app") || id.includes("@firebase/app")) {
            return "firebase-app";
          }

          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }

          if (id.includes("firebase")) {
            return "firebase-vendor";
          }

          if (id.includes("fabric")) {
            return "drawing-vendor";
          }

          if (id.includes("phaser") || id.includes("matter-js")) {
            return "game-engines";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("framer-motion") ||
            id.includes("lucide-react") ||
            id.includes("recharts")
          ) {
            return "ui-vendor";
          }

          return "vendor";
        },
      },
    },
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
      modernPolyfills: true,
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
