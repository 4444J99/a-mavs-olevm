/**
 * Service Worker for ET CETER4
 * Provides basic caching for critical assets with offline fallback
 * Cache limit ~5MB due to large images
 *
 * Bump CACHE_VERSION when deploying updated assets to bust stale caches
 */

const SW_CACHE_PREFIX = 'etceter4-shell-';
const CACHE_VERSION = 6;
const CACHE_NAME = `${SW_CACHE_PREFIX}v${CACHE_VERSION}`;
const MAX_DYNAMIC_ENTRIES = 50;

/**
 * Critical assets to cache
 * Limited to essential CSS, JS, and favicon
 */
// Use relative URLs so the service worker works both at the site root
// (e.g. etceter4.com/) and under a GitHub Pages subpath (e.g. /a-mavs-olevm/).
// self.location.pathname gives the sw.js path; strip the filename to get the base.
const _swBase = self.location.pathname.replace(/\/sw\.js$/, '') || '';
const CRITICAL_ASSETS = [
  _swBase + '/',
  _swBase + '/index.html',
  _swBase + '/offline.html',
  _swBase + '/css/styles.css',
  _swBase + '/css/vendor/tachyons/css/tachyons.min.css',
  _swBase + '/js/runtimeFallback.js',
  _swBase + '/js/data/source-catalogue.js',
  _swBase + '/js/config.js',
  _swBase + '/js/modules/ScriptLoader.js',
  _swBase + '/js/modules/ChamberLoader.js',
  _swBase + '/js/modules/JourneyTracker.js',
  _swBase + '/js/modules/JourneyNarrative.js',
  _swBase + '/js/chamberManifest.js',
  _swBase + '/js/main.js',
  _swBase + '/js/page.js',
  _swBase + '/js/pageData.js',
  _swBase + '/img/favicon.ico',
  _swBase + '/img/placeholder.jpg',
];

/**
 * Limit non-critical dynamic cache entries to prevent unbounded storage growth
 */
async function limitCacheEntries(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const criticalSet = new Set(CRITICAL_ASSETS);
      for (const key of keys) {
        if (keys.length <= maxEntries) break;
        const pathname = new URL(key.url).pathname;
        if (!criticalSet.has(pathname)) {
          await cache.delete(key);
        }
      }
    }
  } catch (error) {
    console.warn('Cache limit enforcement warning:', error);
  }
}

/**
 * Install event - cache critical assets
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CRITICAL_ASSETS).catch(err => {
          console.warn('Failed to cache some assets:', err);
          return Promise.resolve();
        });
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service worker install failed:', err);
      })
  );
});

/**
 * Activate event - clean up old shell caches
 * Namespaced: only deletes obsolete shell caches (prefixed with etceter4-shell- or legacy etceter4-v)
 * Never deletes caches belonging to MediaServiceWorker (etceter4-media- or media-cache-)
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(
              cacheName =>
                (cacheName.startsWith(SW_CACHE_PREFIX) ||
                  /^etceter4-v\d+$/.test(cacheName)) &&
                cacheName !== CACHE_NAME
            )
            .map(cacheName => caches.delete(cacheName))
        ).catch(err => {
          console.warn('Cache cleanup failed:', err);
          return Promise.resolve();
        });
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch(err => {
        console.warn('Service worker activation warning:', err);
      })
  );
});

/**
 * Fetch event - network first, fallback to cache, then explicit offline response
 * Does not cache large images to respect cache limits
 */
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip large image files from caching
  if (
    event.request.url.includes('/img/photos/') ||
    event.request.url.includes('.gif') ||
    event.request.url.includes('.png')
  ) {
    return;
  }

  // Chamber fragments: network-first with cache fallback for offline
  if (
    event.request.url.includes('/chambers/') &&
    event.request.url.endsWith('/fragment.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response('Chamber fragment unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              'Content-Type': 'text/plain',
              'X-Offline-Retryable': 'true',
            },
          });
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(async cache => {
            await cache.put(event.request, responseClone);
            await limitCacheEntries(CACHE_NAME, MAX_DYNAMIC_ENTRIES);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // For navigation requests, serve the offline page
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match(_swBase + '/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }
        // Explicit 503 instead of masking missing assets as valid responses
        return new Response('Asset unavailable offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'text/plain',
            'X-Offline-Retryable': 'true',
          },
        });
      })
  );
});
