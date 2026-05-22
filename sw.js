// GPBC Service Worker - Offline Support
const CACHE_NAME = 'gpbc-v1';
const OFFLINE_URL = '/';

// Core assets to cache for offline use
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles.bundle.css',
    '/navigation.js',
    '/sacred-tokens.css',
    '/images/new-gpbc-logo-final.svg',
    '/plan-visit.html',
    '/songbook.html',
    '/songbook-app.js',
    '/songs-data.js',
    '/styles-songbook.css'
];

// Install: precache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Serve from cache when offline
                return caches.match(event.request).then(cached => {
                    return cached || caches.match(OFFLINE_URL);
                });
            })
    );
});
