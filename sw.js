/**
 * Service Worker for ET CETER4
 * Provides basic caching for critical assets with offline fallback
 * Cache limit ~5MB due to large images
 *
 * Bump CACHE_VERSION when deploying updated assets to bust stale caches
 */

const CACHE_VERSION = 5;
const CACHE_NAME = `etceter4-v${CACHE_VERSION}`;
const MEDIA_CACHE_VERSION = 1;

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
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              const app = /^etceter4-v(\d+)$/.exec(cacheName);
              const shellOld = /^etceter4-shell-v(\d+)$/.exec(cacheName);
              const media =
                /^media-cache-v(\d+)-(audio|thumbnails|waveforms|metadata)$/.exec(
                  cacheName
                );
              const etcMedia =
                /^etceter4-media-v(\d+)-(audio|thumbnails|waveforms|metadata)$/.exec(
                  cacheName
                );
              return (
                (shellOld && Number(shellOld[1]) < 6) ||
                (app && Number(app[1]) < CACHE_VERSION) ||
                (media && Number(media[1]) < MEDIA_CACHE_VERSION) ||
                (etcMedia && Number(etcMedia[1]) < MEDIA_CACHE_VERSION)
              );
            })
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
 * The root worker controls application clients, including their CDN requests.
 * Keep v1 media data compatible with the retired worker; never purge other apps.
 */
const MEDIA_CACHES = ['audio', 'thumbnails', 'waveforms', 'metadata'].map(
  type => `media-cache-v${MEDIA_CACHE_VERSION}-${type}`
);
const MEDIA_DEFAULTS = {
  audioTTL: 604800000,
  thumbnailTTL: 86400000,
  maxAudioCacheSize: 104857600,
  maxThumbnailEntries: 100,
  maxWaveformEntries: 50,
  maxMetadataEntries: 50,
  maxPendingMediaWrites: 4,
  maxPendingMediaBytes: 16777216,
};
const mediaConfig = { ...MEDIA_DEFAULTS };
const ENTRY_LIMIT_KEYS = [
  'maxThumbnailEntries',
  'maxWaveformEntries',
  'maxMetadataEntries',
];
const mediaMaintenance = new Map();
let pendingMediaWrites = 0;
let pendingMediaBytes = 0;

function boundedMediaWrite(cache, store, request, network) {
  const available = mediaConfig.maxPendingMediaBytes - pendingMediaBytes;
  const declared = Number(network.headers.get('Content-Length'));
  if (
    pendingMediaWrites >= mediaConfig.maxPendingMediaWrites ||
    available <= 0 ||
    (Number.isFinite(declared) && declared > available)
  )
    return Promise.resolve();
  // Admit before cloning and consume immediately, never queue an unread tee.
  pendingMediaWrites++;
  let retained = 0;
  const ready = (async () => {
    const copy = network.clone();
    const reader = copy.body?.getReader();
    const chunks = [];
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (
            value.byteLength >
            mediaConfig.maxPendingMediaBytes - pendingMediaBytes
          ) {
            // Tee cancellation may wait for the foreground reader; never await it.
            void reader.cancel().catch(() => {});
            return;
          }
          pendingMediaBytes += value.byteLength;
          retained += value.byteLength;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = new Uint8Array(retained);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    chunks.length = 0;
    return new Response(bytes, {
      status: copy.status,
      statusText: copy.statusText,
      headers: copy.headers,
    });
  })().catch(error => {
    console.warn('[MediaSW] Pending response copy failed:', error);
    return null;
  });
  // Reserve write order now while the bounded copy drains in parallel.
  return queueMediaMaintenance(store, async () => {
    const buffered = await ready;
    if (buffered) await storeMedia(cache, store, request, buffered);
  })
    .catch(error => {
      console.warn('[MediaSW] Pending cache write failed:', error);
    })
    .finally(() => {
      pendingMediaWrites--;
      pendingMediaBytes -= retained;
    });
}

function queueMediaMaintenance(store, task) {
  const previous = mediaMaintenance.get(store) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  mediaMaintenance.set(store, next);
  return next.finally(() => {
    if (mediaMaintenance.get(store) === next) mediaMaintenance.delete(store);
  });
}

function mediaStore(url, includeApplicationAssets = false) {
  const path = url.pathname.toLowerCase();
  if (/\.(mp3|wav|m4a|aac|flac|ogg)$/.test(path)) return MEDIA_CACHES[0];
  // Same-origin application data and artwork must refresh with the app shell.
  // MediaURLResolver serves local media from /media; the dedicated CDN is media.
  if (
    !includeApplicationAssets &&
    url.origin === self.location.origin &&
    !path.startsWith('/media/') &&
    !path.startsWith((_swBase + '/media/').toLowerCase())
  )
    return null;
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(path)) return MEDIA_CACHES[1];
  if (path.endsWith('.json')) {
    return MEDIA_CACHES[path.includes('waveform') ? 2 : 3];
  }
  return null;
}

function mediaMetadata(response) {
  try {
    return JSON.parse(response.headers.get('x-cache-metadata'));
  } catch {
    return null;
  }
}

async function storeMedia(cache, store, request, response) {
  // Cache.put rejects 206. Opaque responses cannot be reconstructed with headers.
  // Return either response untouched to preserve native/CORS playback semantics.
  if (response.status !== 200 || response.type === 'opaque') return;
  try {
    const headers = new Headers(response.headers);
    headers.set(
      'x-cache-metadata',
      JSON.stringify({
        timestamp: Date.now(),
        ttl:
          store === MEDIA_CACHES[1]
            ? mediaConfig.thumbnailTTL
            : mediaConfig.audioTTL,
      })
    );
    await cache.put(
      request,
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    );
    if (store === MEDIA_CACHES[0]) await trimAudio(cache);
    else
      await trimEntries(
        cache,
        mediaConfig[ENTRY_LIMIT_KEYS[MEDIA_CACHES.indexOf(store) - 1]]
      );
  } catch (error) {
    // A quota/storage failure must not turn a playable network response into 503.
    console.warn('[MediaSW] Cache write failed:', error);
  }
}

async function trimAudio(cache) {
  const entries = [];
  let total = 0;
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (!response) continue;
    // CORS responses may omit Content-Length. Measure bytes instead of counting 0.
    const size = (await response.arrayBuffer()).byteLength;
    entries.push({
      request,
      size,
      timestamp: mediaMetadata(response)?.timestamp || 0,
    });
    total += size;
  }
  entries.sort((a, b) => a.timestamp - b.timestamp);
  for (const entry of entries) {
    if (total <= mediaConfig.maxAudioCacheSize) break;
    await cache.delete(entry.request);
    total -= entry.size;
  }
}

async function trimEntries(cache, limit) {
  const entries = [];
  const now = Date.now();
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (!response) continue;
    const metadata = mediaMetadata(response);
    if (
      Number.isFinite(metadata?.timestamp) &&
      Number.isFinite(metadata?.ttl) &&
      now - metadata.timestamp >= metadata.ttl
    ) {
      await cache.delete(request);
      continue;
    }
    entries.push({ request, timestamp: metadata?.timestamp || 0 });
  }
  entries.sort((a, b) => a.timestamp - b.timestamp);
  for (const entry of entries.slice(0, Math.max(0, entries.length - limit))) {
    await cache.delete(entry.request);
  }
}

function unavailable() {
  return new Response('Network error and no cached version available', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain',
      'X-Offline-Retryable': 'true',
    },
  });
}

async function cachedAudioRange(response, range) {
  const bytes = await response.arrayBuffer();
  const length = bytes.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  let start;
  let end;
  if (match && (match[1] || match[2])) {
    start = match[1]
      ? Number(match[1])
      : Math.max(0, length - Number(match[2]));
    end =
      match[1] && match[2]
        ? Math.min(Number(match[2]), length - 1)
        : length - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end ||
    start >= length
  ) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${length}` },
    });
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

async function mediaResponse(request, store, event) {
  let cache;
  let cached;
  let shellFallback = false;
  try {
    cache = await caches.open(store);
    cached = await cache.match(request);
    // Retain previous root-cached audio, images and JSON without other apps' stores.
    if (!cached) {
      cached = await (await caches.open(CACHE_NAME)).match(request);
      shellFallback = Boolean(cached);
    }
  } catch (error) {
    console.warn('[MediaSW] Cache read failed:', error);
  }
  const range = request.headers.get('Range');
  if (store !== MEDIA_CACHES[0] && cached && !shellFallback) {
    const metadata = mediaMetadata(cached);
    if (metadata?.ttl == null || Date.now() - metadata.timestamp < metadata.ttl)
      return cached;
  }
  let network;
  try {
    network = await fetch(request);
    if (network.ok || network.type === 'opaque') {
      // Do not cache a range request even if an origin ignores Range and sends 200.
      if (
        !range &&
        cache &&
        network.status === 200 &&
        network.type !== 'opaque'
      ) {
        event.waitUntil(
          store === MEDIA_CACHES[0]
            ? storeMedia(cache, store, request, network.clone())
            : boundedMediaWrite(cache, store, request, network)
        );
      }
      return network;
    }
  } catch {
    // Audio is network-first. Images/JSON also serve stale entries when offline.
  }
  if (cached) {
    return range && store === MEDIA_CACHES[0]
      ? cachedAudioRange(cached, range)
      : cached;
  }
  return network || unavailable();
}

async function applicationResponse(request, event) {
  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
  } catch (error) {
    console.warn('Application cache unavailable:', error);
  }
  try {
    const response = await fetch(request);
    if (response.status === 200 && cache) {
      try {
        event.waitUntil(
          cache.put(request, response.clone()).catch(error => {
            console.warn('Application cache write failed:', error);
          })
        );
      } catch (error) {
        console.warn('Application cache write failed:', error);
      }
    }
    return response;
  } catch {
    try {
      const cached = cache && (await cache.match(request));
      if (cached) return cached;
    } catch (error) {
      console.warn('Application cache read failed:', error);
    }
    // Earlier workers routed all images/JSON into these owned v1 media stores.
    // Keep those copies usable only on network failure, without restoring TTL
    // routing for live application data or reading unrelated caches.
    const formerStore = mediaStore(new URL(request.url), true);
    if (formerStore) {
      try {
        const historic = await (await caches.open(formerStore)).match(request);
        if (historic) return historic;
      } catch (error) {
        console.warn('Historical application cache read failed:', error);
      }
    }
    try {
      if (cache && request.mode === 'navigate') {
        return (await cache.match(_swBase + '/offline.html')) || unavailable();
      }
    } catch (error) {
      console.warn('Offline shell read failed:', error);
    }
    return unavailable();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const mediaOrigin = url.origin === 'https://media.etceter4.com';
  if (!sameOrigin && !mediaOrigin) return;

  // Preserve the original photograph exclusion and stream video/HLS unchanged.
  // A bypass must precede application caching, including segment/subtitle URLs.
  if (sameOrigin && url.pathname.includes('/img/photos/')) return;
  if (
    request.destination === 'video' ||
    /\.(mp4|webm|mov|m4v|m3u8|mpd|ts|m4s|vtt)$/i.test(url.pathname)
  ) {
    event.respondWith(fetch(request).catch(unavailable));
    return;
  }
  const store = mediaStore(url);
  if (store) {
    event.respondWith(mediaResponse(request, store, event));
  } else if (sameOrigin) {
    event.respondWith(applicationResponse(request, event));
  }
});

// Preserve the media worker's management protocol; ALL means media stores only.
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  const reply = data => event.ports?.[0]?.postMessage(data);
  let operation;
  if (type === 'CLEAR_AUDIO_CACHE' || type === 'CLEAR_ALL_CACHES') {
    const stores =
      type === 'CLEAR_AUDIO_CACHE' ? [MEDIA_CACHES[0]] : MEDIA_CACHES;
    operation = Promise.all(stores.map(name => caches.delete(name))).then(
      () => ({ success: true })
    );
  } else if (type === 'GET_CACHE_SIZE') {
    operation = (async () => {
      let size = 0;
      for (const name of MEDIA_CACHES) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          const response = await cache.match(request);
          if (response) size += (await response.arrayBuffer()).byteLength;
        }
      }
      return { size };
    })();
  } else if (type === 'UPDATE_CONFIG' && payload?.cache) {
    const maintenance = [];
    for (const key of Object.keys(MEDIA_DEFAULTS)) {
      const value = payload.cache[key];
      const entryIndex = ENTRY_LIMIT_KEYS.indexOf(key);
      if (
        Number.isFinite(value) &&
        value >= 0 &&
        ((entryIndex < 0 && key !== 'maxPendingMediaWrites') ||
          Number.isSafeInteger(value))
      ) {
        mediaConfig[key] = value;
        if (entryIndex >= 0)
          maintenance.push(
            queueMediaMaintenance(MEDIA_CACHES[entryIndex + 1], () =>
              caches
                .open(MEDIA_CACHES[entryIndex + 1])
                .then(cache => trimEntries(cache, value))
            )
          );
      }
    }
    operation = Promise.all(maintenance).then(() => ({ success: true }));
  }
  if (operation)
    event.waitUntil(
      operation
        .then(reply)
        .catch(error => reply({ success: false, error: String(error) }))
    );
});
