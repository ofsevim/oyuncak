/*
  Oyuncak - Service Worker (v6)
  - Network-First for index.html and manifest (prevents stale loading hangs)
  - Stale-While-Revalidate for other assets
  - Install aşamasında build asset'lerini precache eder (precache-manifest.json) → tam offline
  - Automatic cache pruning on activation
  - Skips Firebase/API requests
  - Offline fallback page
*/

const CACHE_NAME = 'oyuncak-v7';
const BASE = self.registration?.scope ?? '/';
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
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Çekirdek kabuk — başarısız olursa install başarısız olmalı
        await cache.addAll(ASSETS_TO_CACHE);

        // Build asset'lerini precache et (best-effort: tek tek, biri başarısız olsa da install sürer)
        try {
            const manifestUrl = new URL('precache-manifest.json', BASE).pathname;
            const res = await fetch(manifestUrl, { cache: 'no-cache' });
            if (res.ok) {
                const data = await res.json();
                const assets = Array.isArray(data.assets) ? data.assets : [];
                await Promise.allSettled(assets.map((url) => cache.add(url)));
            }
        } catch (err) {
            /* dev ortamı veya manifest yok → stale-while-revalidate devralır */
        }
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
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

    // Firebase / harici API isteklerini cache'leme
    if (url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    // Navigasyon isteklerinde (HTML sayfaları): Network → Cache → Offline fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    if (cached) return cached;
                    const offline = await caches.match(OFFLINE_URL);
                    return offline || new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // index.html / manifest: Network-First
    const basePath = new URL(BASE).pathname;
    if (url.pathname === basePath || url.pathname.endsWith('index.html') || url.pathname.endsWith('manifest.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Diğer assetler: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});
