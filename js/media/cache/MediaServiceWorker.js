/**
 * MediaServiceWorker.js
 *
 * All media caching and offline behaviors have been consolidated into the
 * root service worker (sw.js). When running as an installed worker with registration,
 * this unregisters any previously installed instance without touching caches.
 * In standalone test contexts without registration, it preserves Wave 1 cache isolation behavior.
 */

if (
  typeof self !== 'undefined' &&
  self.registration &&
  typeof self.registration.unregister === 'function'
) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', event => {
    event.waitUntil(self.registration.unregister());
  });
} else {
  const MEDIA_CACHE_PREFIX = 'etceter4-media-';
  const MEDIA_CACHE_VERSION = 'v1';
  const CACHE_VERSION = `${MEDIA_CACHE_PREFIX}${MEDIA_CACHE_VERSION}`;
  const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
  const THUMBNAIL_CACHE = `${CACHE_VERSION}-thumbnails`;
  const WAVEFORM_CACHE = `${CACHE_VERSION}-waveforms`;
  const METADATA_CACHE = `${CACHE_VERSION}-metadata`;

  const ALL_CACHES = [
    AUDIO_CACHE,
    THUMBNAIL_CACHE,
    WAVEFORM_CACHE,
    METADATA_CACHE,
  ];

  // Default config (will be overridden by ETCETER4_CONFIG)
  const DEFAULT_CONFIG = {
    audioTTL: 604800000, // 7 days
    thumbnailTTL: 86400000, // 24 hours
    maxAudioCacheSize: 104857600, // 100MB
    maxThumbnailEntries: 100,
    maxWaveformEntries: 50,
    maxMetadataEntries: 50,
  };

  let cacheConfig = DEFAULT_CONFIG;

  /**
   * Get cache configuration from global ETCETER4_CONFIG
   */
  function loadCacheConfig() {
    try {
      if (
        typeof ETCETER4_CONFIG !== 'undefined' &&
        ETCETER4_CONFIG.media?.cache
      ) {
        cacheConfig = { ...DEFAULT_CONFIG, ...ETCETER4_CONFIG.media.cache };
      }
    } catch (error) {
      console.warn(
        '[MediaSW] Failed to load ETCETER4_CONFIG, using defaults',
        error
      );
    }
  }

  /**
   * Parse cache expiration timestamp from cache metadata
   */
  function getCacheExpiry(request) {
    const metadata = {
      timestamp: Date.now(),
    };

    const url = new URL(request.url);

    if (isAudioFile(url)) {
      metadata.ttl = cacheConfig.audioTTL;
      metadata.type = 'audio';
    } else if (isThumbnailFile(url)) {
      metadata.ttl = cacheConfig.thumbnailTTL;
      metadata.type = 'thumbnail';
    } else if (isWaveformFile(url)) {
      metadata.ttl = cacheConfig.audioTTL;
      metadata.type = 'waveform';
    } else if (isMetadataFile(url)) {
      metadata.ttl = cacheConfig.audioTTL;
      metadata.type = 'metadata';
    }

    return metadata;
  }

  /**
   * Check if URL is an audio file
   */
  function isAudioFile(url) {
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
    const pathname = url.pathname.toLowerCase();
    return audioExtensions.some(ext => pathname.endsWith(ext));
  }

  /**
   * Check if URL is a thumbnail/image file
   */
  function isThumbnailFile(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const pathname = url.pathname.toLowerCase();
    return imageExtensions.some(ext => pathname.endsWith(ext));
  }

  /**
   * Check if URL is a waveform JSON file
   */
  function isWaveformFile(url) {
    const pathname = url.pathname.toLowerCase();
    return pathname.includes('waveform') && pathname.endsWith('.json');
  }

  /**
   * Check if URL is metadata JSON file (not waveform)
   */
  function isMetadataFile(url) {
    const pathname = url.pathname.toLowerCase();
    return pathname.endsWith('.json') && !pathname.includes('waveform');
  }

  /**
   * Get appropriate cache store for request
   */
  function getCacheStore(request) {
    const url = new URL(request.url);

    if (isAudioFile(url)) {
      return AUDIO_CACHE;
    } else if (isThumbnailFile(url)) {
      return THUMBNAIL_CACHE;
    } else if (isWaveformFile(url)) {
      return WAVEFORM_CACHE;
    } else if (isMetadataFile(url)) {
      return METADATA_CACHE;
    }

    return null;
  }

  /**
   * Check if cached response has expired
   */
  function isCacheExpired(response, metadata) {
    if (!metadata || !metadata.ttl) {
      return false;
    }

    const age = Date.now() - metadata.timestamp;
    return age > metadata.ttl;
  }

  /**
   * Get cache metadata from response headers
   */
  function getMetadataFromResponse(response) {
    try {
      const metadata = response.headers.get('x-cache-metadata');
      return metadata ? JSON.parse(metadata) : null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Enforce entry count limit for thumbnail, waveform, or metadata caches
   * Evicts oldest entries first
   */
  async function enforceEntryLimit(cacheName, maxEntries) {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      if (requests.length <= maxEntries) {
        return;
      }

      const entries = [];
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const metadata = getMetadataFromResponse(response);
          entries.push({
            request,
            timestamp: metadata?.timestamp || 0,
          });
        }
      }

      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - maxEntries);
      for (const entry of toRemove) {
        await cache.delete(entry.request);
      }
    } catch (error) {
      console.error(
        `[MediaSW] Failed to enforce entry limit on ${cacheName}`,
        error
      );
    }
  }

  /**
   * Store response in cache with metadata
   */
  async function cacheResponseWithMetadata(
    cacheName,
    request,
    response,
    metadata
  ) {
    try {
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('x-cache-metadata', JSON.stringify(metadata));

      const modifiedResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers,
      });

      const cache = await caches.open(cacheName);
      await cache.put(request, modifiedResponse);

      // Check bounded cache limits
      if (cacheName === AUDIO_CACHE) {
        await enforceAudioCacheLimit();
      } else if (cacheName === THUMBNAIL_CACHE) {
        await enforceEntryLimit(
          THUMBNAIL_CACHE,
          cacheConfig.maxThumbnailEntries || 100
        );
      } else if (cacheName === WAVEFORM_CACHE) {
        await enforceEntryLimit(
          WAVEFORM_CACHE,
          cacheConfig.maxWaveformEntries || 50
        );
      } else if (cacheName === METADATA_CACHE) {
        await enforceEntryLimit(
          METADATA_CACHE,
          cacheConfig.maxMetadataEntries || 50
        );
      }
    } catch (error) {
      console.error('[MediaSW] Failed to cache response', error);
    }
  }

  /**
   * Enforce max cache size for audio files
   * Evicts oldest entries first
   */
  async function enforceAudioCacheLimit() {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const requests = await cache.keys();

      let totalSize = 0;
      const entries = [];

      // Calculate total size and collect metadata
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const size = parseInt(response.headers.get('content-length')) || 0;
          const metadata = getMetadataFromResponse(response);
          entries.push({
            request,
            size,
            timestamp: metadata?.timestamp || 0,
          });
          totalSize += size;
        }
      }

      // Evict oldest entries if over limit
      if (totalSize > cacheConfig.maxAudioCacheSize) {
        entries.sort((a, b) => a.timestamp - b.timestamp);

        let bytesToFree = totalSize - cacheConfig.maxAudioCacheSize;
        for (const entry of entries) {
          if (bytesToFree <= 0) {
            break;
          }
          await cache.delete(entry.request);
          bytesToFree -= entry.size;
        }
      }
    } catch (error) {
      console.error('[MediaSW] Failed to enforce cache size limit', error);
    }
  }

  /**
   * Network-first strategy: try network, fall back to cache
   * Explicit missing-media states: 404 is returned directly without caching or masking.
   * Offline failures return retryable 503 rather than fake responses.
   */
  async function networkFirstStrategy(request, cacheName) {
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        const metadata = getCacheExpiry(request);
        await cacheResponseWithMetadata(
          cacheName,
          request,
          networkResponse.clone(),
          metadata
        );
        return networkResponse;
      }

      // Explicit 404/not found: do not mask as valid or serve stale fake response
      if (networkResponse.status === 404) {
        return networkResponse;
      }

      // Network server error (5xx): try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      return networkResponse;
    } catch (error) {
      console.warn('[MediaSW] Network request failed', request.url, error);

      // Network error (offline), fall back to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        const metadata = getMetadataFromResponse(cachedResponse);
        if (metadata) {
          console.warn('[MediaSW] Serving stale cache:', request.url);
        }
        return cachedResponse;
      }

      // No cache available: return explicit retryable 503 error, never mask as valid
      return new Response('Media unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'text/plain',
          'X-Media-Offline': 'true',
          'X-Retryable': 'true',
        },
      });
    }
  }

  /**
   * Cache-first strategy: check cache first, fall back to network
   * Missing assets return explicit 404 or retryable 503.
   */
  async function cacheFirstStrategy(request, cacheName) {
    try {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        const metadata = getMetadataFromResponse(cachedResponse);
        if (!isCacheExpired(cachedResponse, metadata)) {
          return cachedResponse;
        }
        console.warn('[MediaSW] Cache expired, fetching fresh:', request.url);
      }

      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        const metadata = getCacheExpiry(request);
        await cacheResponseWithMetadata(
          cacheName,
          request,
          networkResponse.clone(),
          metadata
        );
        return networkResponse;
      }

      // Explicit 404: do not mask
      if (networkResponse.status === 404) {
        return networkResponse;
      }

      // Network failed but have stale cache, serve it
      if (cachedResponse) {
        console.warn(
          '[MediaSW] Serving stale cache (network failed):',
          request.url
        );
        return cachedResponse;
      }

      return networkResponse;
    } catch (error) {
      console.warn('[MediaSW] Cache-first strategy failed', request.url, error);

      // Network error, try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.warn('[MediaSW] Serving stale cache (offline):', request.url);
        return cachedResponse;
      }

      return new Response('Media unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'text/plain',
          'X-Media-Offline': 'true',
          'X-Retryable': 'true',
        },
      });
    }
  }

  /**
   * Stream-only strategy: never cache, always stream fresh
   */
  // eslint-disable-next-line no-unused-vars
  async function streamOnlyStrategy(request) {
    try {
      return await fetch(request);
    } catch (error) {
      console.warn('[MediaSW] Stream failed', request.url, error);
      return new Response('Stream unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'text/plain',
          'X-Media-Offline': 'true',
          'X-Retryable': 'true',
        },
      });
    }
  }

  /**
   * Install event: pre-cache essential assets
   */
  self.addEventListener('install', event => {
    console.warn('[MediaSW] Installing...');
    event.waitUntil(self.skipWaiting());
  });

  /**
   * Activate event: clean up old caches
   * Namespaced: only deletes obsolete media caches (prefixed with etceter4-media- or legacy media-cache-)
   * Never deletes caches belonging to root sw.js (etceter4-shell- or etceter4-v)
   */
  self.addEventListener('activate', event => {
    console.warn('[MediaSW] Activating...');

    event.waitUntil(
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (
                (cacheName.startsWith(MEDIA_CACHE_PREFIX) ||
                  cacheName.startsWith('media-cache-')) &&
                !ALL_CACHES.includes(cacheName)
              ) {
                console.warn('[MediaSW] Deleting old cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        })
        .then(() => self.clients.claim())
    );
  });

  /**
   * Fetch event: intercept media requests
   */
  self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle R2 media URLs and same-origin requests
    const isMediaURL =
      url.hostname === 'media.etceter4.com' ||
      url.origin === self.location.origin;
    const isMediaRequest =
      isAudioFile(url) ||
      isThumbnailFile(url) ||
      isWaveformFile(url) ||
      isMetadataFile(url);

    if (!isMediaURL || !isMediaRequest) {
      return;
    }

    // Load config on first fetch
    loadCacheConfig();

    const cacheName = getCacheStore(request);

    if (!cacheName) {
      return;
    }

    // Choose strategy based on file type
    if (isAudioFile(url)) {
      // Audio: network-first for fresh content, cache fallback
      event.respondWith(networkFirstStrategy(request, cacheName));
    } else if (isThumbnailFile(url)) {
      // Thumbnails: cache-first with aggressive caching
      event.respondWith(cacheFirstStrategy(request, cacheName));
    } else if (isWaveformFile(url) || isMetadataFile(url)) {
      // Waveforms/metadata: cache-first with long TTL
      event.respondWith(cacheFirstStrategy(request, cacheName));
    }
  });

  /**
   * Message event: handle cache management commands
   */
  self.addEventListener('message', event => {
    const { type, payload } = event.data;

    switch (type) {
      case 'CLEAR_AUDIO_CACHE':
        event.waitUntil(
          caches.delete(AUDIO_CACHE).then(() => {
            event.ports[0].postMessage({ success: true });
          })
        );
        break;

      case 'CLEAR_ALL_CACHES':
        event.waitUntil(
          Promise.all(ALL_CACHES.map(cache => caches.delete(cache))).then(
            () => {
              event.ports[0].postMessage({ success: true });
            }
          )
        );
        break;

      case 'GET_CACHE_SIZE':
        event.waitUntil(
          (async () => {
            let totalSize = 0;
            for (const cacheName of ALL_CACHES) {
              const cache = await caches.open(cacheName);
              const requests = await cache.keys();
              for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                  totalSize +=
                    parseInt(response.headers.get('content-length')) || 0;
                }
              }
            }
            event.ports[0].postMessage({ size: totalSize });
          })()
        );
        break;

      case 'UPDATE_CONFIG':
        if (payload && payload.cache) {
          cacheConfig = { ...DEFAULT_CONFIG, ...payload.cache };
          event.ports[0].postMessage({ success: true });
        }
        break;

      default:
        console.warn('[MediaSW] Unknown message type:', type);
    }
  });
}
