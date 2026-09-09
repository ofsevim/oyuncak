/*
  Oyuncak - Service Worker (v8 – auto-update)
  - Build-unique versiyon: __SW_VERSION__ (vite plugin tarafından inject edilir)
  - Network-first navigation with a versioned offline shell
  - Cache-first static resources
  - Install aşamasında build asset'lerini precache eder (precache-manifest.json) → tam offline
  - Automatic cache pruning on activation
  - Skips Firebase/API requests
  - Offline fallback page
  - Yeni versiyon tespit edildiğinde client'lara bildirim gönderir
*/

const SW_VERSION = '__SW_VERSION__';
const CACHE_NAME = 'oyuncak-' + SW_VERSION;
const BASE = self.registration && self.registration.scope ? self.registration.scope : '/';
const OFFLINE_URL = new URL('offline.html', BASE).pathname;
const ASSETS_TO_CACHE = [
    BASE,
    new URL('index.html', BASE).pathname,
    new URL('manifest.json', BASE).pathname,
    new URL('favicon.png', BASE).pathname,
    new URL('icon-192.png', BASE).pathname,
    new URL('icon-512.png', BASE).pathname,
    new URL('maskable-icon-192.png', BASE).pathname,
    new URL('maskable-icon-512.png', BASE).pathname,
    OFFLINE_URL,
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Çekirdek kabuk — başarısız olursa install başarısız olmalı
        await cache.addAll(ASSETS_TO_CACHE);

        const manifestUrl = new URL('precache-manifest.json', BASE).pathname;
        const res = await fetch(manifestUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Offline manifest unavailable');
        const data = await res.json();
        if (!Array.isArray(data.assets) || data.assets.length === 0) throw new Error('Invalid offline manifest');
        // Bound concurrency on mobile and fail the installation if any required
        // asset is missing. The previous worker remains available on updates.
        for (let start = 0; start < data.assets.length; start += 6) {
            await Promise.all(data.assets.slice(start, start + 6).map(async (asset) => {
                const response = await fetch(asset);
                if (!response.ok) throw new Error('Offline asset unavailable: ' + asset);
                await cache.put(asset, response.clone());
                // Browsers may remember the HTML redirect even while offline.
                // Cache its same-origin destination as well as the original URL.
                if (response.redirected && response.url) {
                    const destination = new URL(response.url);
                    if (destination.origin === new URL(BASE).origin && destination.pathname.startsWith(new URL(BASE).pathname)) {
                        await cache.put(destination.href, response.clone());
                    }
                }
            }));
        }
    })());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Bu uygulamaya ait olmayan cache'lere dokunma. Aynı origin
                    // altında barınan başka bir uygulamanın offline verisi olabilir.
                    if (cacheName.startsWith('oyuncak-') && cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    // Only cache this application's static resources; APIs and fonts stay out.
    if (url.origin !== new URL(BASE).origin || !url.pathname.startsWith(new URL(BASE).pathname)) return;

    // Navigasyon isteklerinde (HTML sayfaları): Network → Cache → Offline fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetchWithTimeout(event.request)
                .then((response) => {
                    // Let the browser follow a network navigation redirect itself.
                    if (response.type === 'opaqueredirect') return response;
                    if (!response.ok) throw new Error('Navigation unavailable');
                    return response;
                })
                .catch(async () => {
                    const cached = await matchCurrentCache(event.request);
                    if (cached) return cached;
                    const relativePath = url.pathname.slice(new URL(BASE).pathname.length);
                    if (!relativePath.startsWith('games/battlecity/')) {
                        const shell = await matchCurrentCache(new URL('index.html', BASE).pathname);
                        if (shell) return shell;
                    }
                    const offline = await matchCurrentCache(OFFLINE_URL);
                    return offline || new Response('Offline', { status: 503 });
                })
                .then(navigationResponse)
        );
        return;
    }

    // Hash'li asset'ler (Vite tarafından /assets/chunk-abc123.js): Cache-First
    // Dosya adında hash olduğundan, içerik değiştiğinde URL da değişir → eski cache sorun olmaz
    const assetsPath = new URL('assets/', BASE).pathname;
    if (url.pathname.startsWith(assetsPath) && /-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname)) {
        event.respondWith(
            matchCurrentCache(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const cloned = response.clone();
                        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned)));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Versioned game resources are already precached. Avoid unbounded runtime
    // caches for arbitrary URLs and query parameters.
    event.respondWith(
        matchCurrentCache(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch(() => new Response('', { status: 503 }));
        })
    );
});

function navigationResponse(response) {
    // Precache fetches follow redirects (e.g. Netlify's HTML URL normalization).
    // Navigation requests may use redirect:"manual" and reject a cached response
    // with redirected:true. Preserve the document, but not its fetch redirect history.
    if (!response.redirected) return response;
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}

async function fetchWithTimeout(request) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try { return await fetch(request, { signal: controller.signal }); }
    finally { clearTimeout(timer); }
}

async function matchCurrentCache(request) {
    const cache = await caches.open(CACHE_NAME);
    // Same-origin static files do not vary by Origin. Module requests include
    // that header while install-time fetches may omit it (Vite sends Vary: Origin).
    return cache.match(request, { ignoreVary: true });
}
