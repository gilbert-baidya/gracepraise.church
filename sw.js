/**
 * ============================================================================
 * GPBC SERVICE WORKER
 * ============================================================================
 * Strategy:
 *   - Static assets (CSS, JS, WebP/PNG/SVG images, fonts): Cache First,
 *     Network Fallback (instant repeat loads + offline access).
 *   - HTML navigations: Network First, Cache Fallback (always fresh when
 *     online, still available offline).
 *   - Cross-origin (fonts, CDN): Stale-While-Revalidate.
 *
 * Bump CACHE_VERSION to invalidate old caches on deploy.
 * ============================================================================
 */

const CACHE_VERSION = 'gpbc-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Core assets precached on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sacred-tokens.css',
  '/redesign-styles.css',
  '/logo-styles.css',
  '/logo-loading.css',
  '/navigation.js',
  '/logo-loading.js',
  '/logo-loader.js',
  '/js/partials.js',
  '/images/new-gpbc-logo-final.svg',
  '/images/favicons/android-chrome-192x192.png',
  '/images/favicons/android-chrome-512x512.png',
  '/images/favicons/apple-touch-icon.png'
];

// File extensions treated as long-lived static assets (Cache First)
const STATIC_ASSET_REGEX = /\.(?:css|js|mjs|woff2?|ttf|otf|eot|webp|png|jpe?g|gif|svg|ico|mp3|webm)$/i;

// ----------------------------------------------------------------------------
// INSTALL — precache the app shell
// ----------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {
        // Best-effort precache: don't fail install if one asset 404s
        return Promise.all(
          PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
        );
      }))
      .then(() => self.skipWaiting())
  );
});

// ----------------------------------------------------------------------------
// ACTIVATE — clean up old cache versions
// ----------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ----------------------------------------------------------------------------
// FETCH — route by request type
// ----------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1. HTML navigations → Network First, Cache Fallback
  if (request.mode === 'navigate' ||
      (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2. Same-origin static assets → Cache First, Network Fallback
  if (sameOrigin && STATIC_ASSET_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. Cross-origin (fonts, CDN scripts/styles) → Stale-While-Revalidate
  if (!sameOrigin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 4. Default same-origin → Cache First
  event.respondWith(cacheFirst(request));
});

// ----------------------------------------------------------------------------
// STRATEGIES
// ----------------------------------------------------------------------------

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaqueredirect') {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached
    return caches.match(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: cached homepage shell
    return caches.match('/index.html') || caches.match('/');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

// ----------------------------------------------------------------------------
// MESSAGE — allow pages to trigger immediate activation
// ----------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
