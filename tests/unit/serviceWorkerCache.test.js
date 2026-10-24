import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';

const swSource = readFileSync(resolve(__dirname, '../../sw.js'), 'utf8');
const mediaSwSource = readFileSync(
  resolve(__dirname, '../../js/media/cache/MediaServiceWorker.js'),
  'utf8'
);

describe('ServiceWorker cache isolation and boundaries', () => {
  let mockCaches;
  let deletedCaches;
  let eventListeners;

  beforeEach(() => {
    deletedCaches = [];
    eventListeners = new Map();
    mockCaches = {
      keys: vi.fn(async () => []),
      delete: vi.fn(async name => {
        deletedCaches.push(name);
        return true;
      }),
      open: vi.fn(async () => ({
        addAll: vi.fn(async () => {}),
        put: vi.fn(async () => {}),
        match: vi.fn(async () => null),
        keys: vi.fn(async () => []),
        delete: vi.fn(async () => true),
      })),
      match: vi.fn(async () => null),
    };
  });

  function createWorkerContext(source, pathname = '/sw.js') {
    const listeners = new Map();
    const self = {
      location: {
        origin: 'https://etceter4.com',
        pathname,
      },
      clients: {
        claim: vi.fn(async () => {}),
      },
      skipWaiting: vi.fn(async () => {}),
      addEventListener: vi.fn((event, handler) => {
        listeners.set(event, handler);
      }),
    };

    const context = createContext({
      self,
      caches: mockCaches,
      fetch: vi.fn(),
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Response: globalThis.Response,
      Request: globalThis.Request,
      Headers: globalThis.Headers,
      URL: globalThis.URL,
      Date: globalThis.Date,
      parseInt: globalThis.parseInt,
      JSON: globalThis.JSON,
      Promise: globalThis.Promise,
      Set: globalThis.Set,
      Map: globalThis.Map,
    });

    runInContext(source, context);
    return { context, self, listeners };
  }

  describe('sw.js shell cache isolation', () => {
    it('activates and only prunes obsolete shell caches without deleting media caches', async () => {
      mockCaches.keys.mockResolvedValue([
        'etceter4-shell-v6',
        'etceter4-shell-v5',
        'etceter4-v4',
        'etceter4-media-v1-audio',
        'etceter4-media-v1-thumbnails',
        'media-cache-v1-audio',
      ]);

      const { listeners } = createWorkerContext(swSource, '/sw.js');
      const activateHandler = listeners.get('activate');
      expect(activateHandler).toBeDefined();

      let waitUntilPromise = null;
      activateHandler({
        waitUntil: promise => {
          waitUntilPromise = promise;
        },
      });

      await waitUntilPromise;

      expect(deletedCaches).toContain('etceter4-shell-v5');
      expect(deletedCaches).toContain('etceter4-v4');
      expect(deletedCaches).not.toContain('etceter4-shell-v6');
      expect(deletedCaches).not.toContain('etceter4-media-v1-audio');
      expect(deletedCaches).not.toContain('etceter4-media-v1-thumbnails');
      expect(deletedCaches).not.toContain('media-cache-v1-audio');
    });

    it('returns an explicit retryable 503 on network failure for missing assets', async () => {
      const { listeners, context } = createWorkerContext(swSource, '/sw.js');
      const fetchHandler = listeners.get('fetch');

      let responsePromise = null;
      const fakeRequest = new Request('https://etceter4.com/js/missing-chunk.js');

      // Mock fetch rejection (offline network failure) inside vm context
      context.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      fetchHandler({
        request: fakeRequest,
        respondWith: promise => {
          responsePromise = promise;
        },
      });

      const response = await responsePromise;
      expect(response.status).toBe(503);
      expect(response.headers.get('X-Offline-Retryable')).toBe('true');
    });

    it('does not cache 404 responses as valid entries', async () => {
      const { listeners } = createWorkerContext(swSource, '/sw.js');
      const fetchHandler = listeners.get('fetch');

      const mockCacheInstance = {
        put: vi.fn(),
        keys: vi.fn(async () => []),
      };
      mockCaches.open.mockResolvedValue(mockCacheInstance);

      let responsePromise = null;
      const fakeRequest = new Request('https://etceter4.com/js/nonexistent.js');
      const notFoundResponse = new Response('Not found', { status: 404 });

      // Mock fetch resolving to 404
      const fetchSpy = vi.fn().mockResolvedValue(notFoundResponse);
      const context = createWorkerContext(swSource, '/sw.js');
      context.context.fetch = fetchSpy;

      const handler = context.listeners.get('fetch');
      handler({
        request: fakeRequest,
        respondWith: promise => {
          responsePromise = promise;
        },
      });

      const response = await responsePromise;
      expect(response.status).toBe(404);
      expect(mockCacheInstance.put).not.toHaveBeenCalled();
    });
  });

  describe('MediaServiceWorker cache isolation and boundaries', () => {
    it('activates and only prunes obsolete media caches without deleting shell caches', async () => {
      mockCaches.keys.mockResolvedValue([
        'etceter4-media-v1-audio',
        'etceter4-media-v1-thumbnails',
        'etceter4-media-v0-audio',
        'media-cache-v0-audio',
        'etceter4-shell-v6',
        'etceter4-v5',
      ]);

      const { listeners } = createWorkerContext(
        mediaSwSource,
        '/js/media/cache/MediaServiceWorker.js'
      );
      const activateHandler = listeners.get('activate');
      expect(activateHandler).toBeDefined();

      let waitUntilPromise = null;
      activateHandler({
        waitUntil: promise => {
          waitUntilPromise = promise;
        },
      });

      await waitUntilPromise;

      expect(deletedCaches).toContain('etceter4-media-v0-audio');
      expect(deletedCaches).toContain('media-cache-v0-audio');
      expect(deletedCaches).not.toContain('etceter4-media-v1-audio');
      expect(deletedCaches).not.toContain('etceter4-media-v1-thumbnails');
      expect(deletedCaches).not.toContain('etceter4-shell-v6');
      expect(deletedCaches).not.toContain('etceter4-v5');
    });

    it('returns explicit retryable 503 on audio network error without cached fallback', async () => {
      const { listeners, context } = createWorkerContext(
        mediaSwSource,
        '/js/media/cache/MediaServiceWorker.js'
      );
      const fetchHandler = listeners.get('fetch');

      context.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      let responsePromise = null;
      const fakeRequest = new Request('https://etceter4.com/audio/track01.mp3');

      fetchHandler({
        request: fakeRequest,
        respondWith: promise => {
          responsePromise = promise;
        },
      });

      const response = await responsePromise;
      expect(response.status).toBe(503);
      expect(response.headers.get('X-Media-Offline')).toBe('true');
      expect(response.headers.get('X-Retryable')).toBe('true');
    });

    it('returns truthful 404 without masking or caching missing audio', async () => {
      const { listeners, context } = createWorkerContext(
        mediaSwSource,
        '/js/media/cache/MediaServiceWorker.js'
      );
      const fetchHandler = listeners.get('fetch');

      const mockCacheInstance = {
        put: vi.fn(),
        keys: vi.fn(async () => []),
      };
      mockCaches.open.mockResolvedValue(mockCacheInstance);

      const notFound = new Response('Track not found', { status: 404 });
      context.fetch = vi.fn().mockResolvedValue(notFound);

      let responsePromise = null;
      const fakeRequest = new Request('https://etceter4.com/audio/missing.mp3');

      fetchHandler({
        request: fakeRequest,
        respondWith: promise => {
          responsePromise = promise;
        },
      });

      const response = await responsePromise;
      expect(response.status).toBe(404);
      expect(mockCacheInstance.put).not.toHaveBeenCalled();
    });

    it('enforces bounded cache size for audio and entry counts for thumbnails', async () => {
      const deletedKeys = [];
      const mockAudioCache = {
        put: vi.fn(),
        keys: vi.fn(async () => [
          new Request('https://etceter4.com/audio/1.mp3'),
          new Request('https://etceter4.com/audio/2.mp3'),
        ]),
        match: vi.fn(async req => {
          const headers = new Headers();
          headers.set('content-length', '60000000'); // 60MB each -> total 120MB > 100MB limit
          headers.set(
            'x-cache-metadata',
            JSON.stringify({
              timestamp: req.url.includes('1.mp3') ? 1000 : 2000,
            })
          );
          return new Response('fake audio bytes', { headers });
        }),
        delete: vi.fn(async req => {
          deletedKeys.push(req.url);
        }),
      };

      mockCaches.open.mockImplementation(async name => {
        if (name.includes('audio')) return mockAudioCache;
        return {
          put: vi.fn(),
          keys: vi.fn(async () => []),
          match: vi.fn(async () => null),
          delete: vi.fn(),
        };
      });

      const { listeners, context } = createWorkerContext(
        mediaSwSource,
        '/js/media/cache/MediaServiceWorker.js'
      );
      const fetchHandler = listeners.get('fetch');

      context.fetch = vi.fn().mockResolvedValue(
        new Response('new track', {
          status: 200,
          headers: new Headers({ 'content-length': '1000' }),
        })
      );

      let responsePromise = null;
      fetchHandler({
        request: new Request('https://etceter4.com/audio/new.mp3'),
        respondWith: promise => {
          responsePromise = promise;
        },
      });

      await responsePromise;
      // Allow async cache enforcement
      await new Promise(r => setTimeout(r, 50));

      // The oldest 1.mp3 should have been evicted to bring cache under 100MB
      expect(deletedKeys).toContain('https://etceter4.com/audio/1.mp3');
    });
  });
});
