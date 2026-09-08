import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import legacy from "@vitejs/plugin-legacy";
import { PAGE_ROUTES, getPageMetadata } from './src/data/pageMetadata';
import { REQUIRED_FIREBASE_KEYS } from './src/lib/envKeys';

function routeMetadataPlugin(publicUrl: string): Plugin {
  let basePath = '/';
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
  return {
    name: 'route-metadata',
    apply: 'build',
    configResolved(config) { basePath = config.base.replace(/\/$/, ''); },
    closeBundle() {
      const root = path.resolve(__dirname, 'dist');
      const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const route of PAGE_ROUTES) {
        const metadata = getPageMetadata(route);
        const canonical = publicUrl + basePath + route;
        const html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(metadata.title)}</title>`)
          .replace(/(<meta\s+(?:name="(?:description|twitter:description)"|property="og:description")\s+content=")[^"]*("\s*\/?>)/g, `$1${escape(metadata.description)}$2`)
          .replace(/(<meta\s+(?:property="og:title"|name="twitter:title")\s+content=")[^"]*("\s*\/?>)/g, `$1${escape(metadata.title)}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escape(canonical)}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escape(canonical)}$2`);
        const directory = path.join(root, route.slice(1));
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'index.html'), html);
      }
      fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGE_ROUTES.map((route) => `  <url><loc>${escape(publicUrl + basePath + route)}</loc></url>`).join('\n')}\n</urlset>\n`);
      fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${publicUrl + basePath}/sitemap.xml\n`);
    },
  };
}

/**
 * Build sırasında sw.js içindeki __SW_VERSION__ placeholder'ını benzersiz
 * build hash'iyle değiştirir → her deploy'da tarayıcı yeni SW tespit eder.
 */
function swVersionPlugin(): Plugin {
  return {
    name: "sw-version",
    apply: "build",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist", "sw.js");
      if (!fs.existsSync(swPath)) return;

      const buildHash = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      let content = fs.readFileSync(swPath, "utf-8");
      content = content.replace(/__SW_VERSION__/g, buildHash);
      fs.writeFileSync(swPath, content);
    },
  };
}

/**
 * Build sonrası dist/assets içindeki hash'li JS/CSS/font dosyalarını tarayıp
 * dist/precache-manifest.json üretir. Service Worker bunu install aşamasında
 * okuyup tüm uygulama asset'lerini önbelleğe alır → ilk açılıştan sonra tam offline.
 */
function precacheManifestPlugin(): Plugin {
  let basePath = "/";
  return {
    name: "precache-manifest",
    apply: "build",
    configResolved(config) {
      basePath = config.base.endsWith("/") ? config.base : `${config.base}/`;
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const assetsDir = path.join(distDir, "assets");
      if (!fs.existsSync(assetsDir)) return;

      const assets = fs
        .readdirSync(assetsDir)
        .filter((f) => /\.(js|css|woff2?)$/.test(f))
        .map((f) => `${basePath}assets/${f}`)
        .sort();

      const addPublicAssets = (relative: string) => {
        const directory = path.join(distDir, relative);
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const child = `${relative}/${entry.name}`;
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('jasmine')) addPublicAssets(child);
          } else if (/\.(?:html|js|css|png|webp|ogg|ttf)$/.test(entry.name)) {
            assets.push(`${basePath}${child}`);
          }
        }
      };
      addPublicAssets('games/battlecity');
      addPublicAssets('coloring');

      fs.writeFileSync(
        path.join(distDir, "precache-manifest.json"),
        JSON.stringify({ assets }),
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const values = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (command === 'build' && mode !== 'development') {
    const missing = REQUIRED_FIREBASE_KEYS.filter((key) => !values[key]?.trim());
    if (missing.length) throw new Error(`Eksik üretim ayarları: ${missing.join(', ')}. .env dosyasını veya dağıtım ortamını kontrol edin.`);
  }
  const publicUrl = (values.VITE_PUBLIC_URL || 'https://oyuncak.app').replace(/\/$/, '');
  if (!/^https?:\/\//.test(publicUrl)) throw new Error('VITE_PUBLIC_URL http veya https ile başlamalıdır.');
  return ({
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
    swVersionPlugin(),
    precacheManifestPlugin(),
    routeMetadataPlugin(publicUrl),
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
});
});
