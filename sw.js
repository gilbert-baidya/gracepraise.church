/**
 * ----------------------------------------------------------------------------
 * GPBC SERVICE WORKER — V12
 * ----------------------------------------------------------------------------
 * Freshness strategy:
 *   - HTML navigations: Network First, cache fallback.
 *   - CSS/JS: Network First, cache fallback to avoid stale V11 styles/scripts.
 *   - Images/fonts/static media: Cache First, network fallback.
 *   - Cross-origin HTTP(S): Stale-While-Revalidate.
 *
 * Unsupported schemes (chrome-extension:, moz-extension:, etc.) are ignored.
 * ----------------------------------------------------------------------------
 */

const CACHE_VERSION = 'gpbc-v12';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';
const OFFLINE_URL = '/';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sacred-tokens.css',
  '/redesign-styles.css',
  '/styles.bundle.css',
  '/logo-styles.css',
  '/logo-loading.css',
  '/navigation.js',
  '/logo-loading.js',
  '/logo-loader.js',
  '/js/partials.js',
  '/images/new-gpbc-logo-final.svg',
  '/images/favicons/android-chrome-192x192.png',
  '/images/favicons/android-chrome-512x512.png',
  '/images/favicons/apple-touch-icon.png',
  '/plan-visit.html',
  '/songbook.html',
  '/songbook-app.js',
  '/songs-data.js',
  '/styles-songbook.css'
];

const CSS_JS_REGEX = /\.(?:css|js|mjs)$/i;
const STATIC_ASSET_REGEX = /\.(?:woff2?|ttf|otf|eot|webp|png|jpe?g|gif|svg|ico|mp3|webm)$/i;
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('gpbc-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return;

  if (url.origin !== self.location.origin) return;

  const sameOrigin = url.origin === self.location.origin;
  const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');

  if (request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, OFFLINE_URL));
    return;
  }

  if (sameOrigin && CSS_JS_REGEX.test(url.pathname)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (sameOrigin && STATIC_ASSET_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (!sameOrigin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await cacheResponse(request, response, cacheName);
    return response;
  } catch (error) {
    return (await caches.match(request, { ignoreSearch: false })) || Response.error();
  }
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response, cacheName);
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    if (fallbackUrl) {
      return (await caches.match(fallbackUrl, { ignoreSearch: false }))
        || (await caches.match('/index.html', { ignoreSearch: false }))
        || (await caches.match('/', { ignoreSearch: false }))
        || Response.error();
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });

  const networkFetch = fetch(request)
    .then(async (response) => {
      await cacheResponse(request, response, cacheName);
      return response;
    })
    .catch(() => cached || Response.error());

  return cached || networkFetch;
}

async function cacheResponse(request, response, cacheName) {
  if (!response || response.status !== 200 || response.type === 'opaqueredirect') return;

  const url = new URL(request.url);
  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return;

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
