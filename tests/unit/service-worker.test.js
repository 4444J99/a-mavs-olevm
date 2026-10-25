import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';
import { URL, fileURLToPath, URL as NodeURL } from 'node:url';
import { describe, it, expect, vi } from 'vitest';

const projectRoot = resolve(
  fileURLToPath(new NodeURL('../../', import.meta.url))
);

const origin = 'https://app.example';
const shell = 'etceter4-v5';
const media = ['audio', 'thumbnails', 'waveforms', 'metadata'].map(
  type => `media-cache-v1-${type}`
);

// Execute the shipped classic worker, with an in-memory implementation of the
// Cache API boundary. Browser lifecycle and native CacheStorage are tested in E2E.
function worker(path = 'sw.js', { base = '', stores = new Map() } = {}) {
  const absolute = value => new URL(value.url || value, origin).href;
  const cacheStorage = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        keys: async () => [...entries.keys()].map(url => new Request(url)),
        match: async request => entries.get(absolute(request))?.clone(),
        put: async (request, response) => {
          if (response.status === 206) throw new TypeError('Partial response');
          entries.set(absolute(request), response.clone());
        },
        delete: async request => entries.delete(absolute(request)),
        addAll: async urls => {
          for (const url of urls) {
            entries.set(absolute(url), new Response(`precache:${url}`));
          }
        },
      };
    },
    match: async request => {
      for (const name of stores.keys()) {
        const response = await (await cacheStorage.open(name)).match(request);
        if (response) return response;
      }
    },
  };
  const listeners = {};
  const unregister = vi.fn(async () => true);
  const fetch = vi.fn(async () => new Response('network'));
  const self = {
    location: new URL(`${origin}${base}/${path}`),
    registration: { unregister, scope: `${origin}${base}/` },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (type, callback) => {
      listeners[type] = callback;
    },
  };
  vm.runInNewContext(readFileSync(resolve(projectRoot, path), 'utf8'), {
    self,
    caches: cacheStorage,
    fetch,
    URL,
    Request,
    Response,
    Headers,
    console,
  });
  return {
    stores,
    caches: cacheStorage,
    fetch,
    self,
    dispatch(type, data = {}) {
      const pending = [];
      let response;
      listeners[type]?.({
        ...data,
        waitUntil: promise => pending.push(promise),
        respondWith: promise => {
          response = promise;
        },
      });
      return {
        response: Promise.resolve(response),
        finish: () => Promise.all(pending),
      };
    },
    async emit(type, data = {}) {
      const event = this.dispatch(type, data);
      const result = await event.response;
      await event.finish();
      return result;
    },
    async seed(name, path, body, metadata) {
      const headers = metadata
        ? { 'x-cache-metadata': JSON.stringify(metadata) }
        : {};
      await (
        await cacheStorage.open(name)
      ).put(new Request(origin + path), new Response(body, { headers }));
    },
  };
}

const request = (path, options) => new Request(new URL(path, origin), options);
const offline = w => w.fetch.mockRejectedValue(new TypeError('offline'));

describe('root service worker', () => {
  it.each([
    ['/js/living-pantheon/data/fragments.json', 3],
    ['/img/interface.png', 1],
    ['/js/data/waveform-settings.json', 2],
  ])(
    'retains formerly media-cached application asset %s offline',
    async (path, index) => {
      const w = worker();
      await w.seed(media[index], path, 'historical application content');
      offline(w);
      expect(
        await (await w.emit('fetch', { request: request(path) })).text()
      ).toBe('historical application content');
    }
  );

  it('does not recover an application asset from an unrelated store', async () => {
    const w = worker();
    await w.seed('another-app', '/img/interface.png', 'unrelated');
    offline(w);
    expect(
      (await w.emit('fetch', { request: request('/img/interface.png') })).status
    ).toBe(503);
  });

  it('prefers the current application copy over a historical media copy offline', async () => {
    const w = worker();
    const path = '/js/living-pantheon/data/fragments.json';
    await w.seed(media[3], path, 'historical');
    await w.seed(shell, path, 'current');
    offline(w);
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('current');
  });

  it('serializes an expiry scan with a foreground refresh of the same entry', async () => {
    const w = worker();
    const path = '/media/covers/race.png';
    await w.seed(media[1], path, 'expired', { timestamp: 0, ttl: 1 });
    let release;
    let observed;
    const held = new Promise(resolve => {
      release = resolve;
    });
    const scanning = new Promise(resolve => {
      observed = resolve;
    });
    const open = w.caches.open;
    let holdOnce = true;
    w.caches.open = async name => {
      const cache = await open(name);
      return {
        ...cache,
        match: async request => {
          const response = await cache.match(request);
          if (name === media[1] && holdOnce) {
            holdOnce = false;
            observed();
            await held;
          }
          return response;
        },
      };
    };
    const updating = w.emit('message', {
      data: {
        type: 'UPDATE_CONFIG',
        payload: { cache: { maxThumbnailEntries: 1 } },
      },
    });
    await scanning;
    const fetching = w.dispatch('fetch', { request: request(path) });
    expect(await (await fetching.response).text()).toBe('network');
    release();
    await updating;
    await fetching.finish();
    expect(await (await (await open(media[1])).match(path)).text()).toBe(
      'network'
    );
  });

  it.each([
    [1, 'maxThumbnailEntries', '/media/covers/', '.png'],
    [2, 'maxWaveformEntries', '/media/waveforms/', '.json'],
    [3, 'maxMetadataEntries', '/media/metadata/', '.json'],
  ])(
    'expires and bounds owned media store %s on configuration and writes',
    async (index, key, base, extension) => {
      const w = worker();
      const old = base + 'old' + extension;
      const stale = base + 'expired' + extension;
      const fresh = base + 'new' + extension;
      await w.seed(media[index], old, 'old', {
        timestamp: Date.now() - 5000,
        ttl: 100000,
      });
      await w.seed(media[index], stale, 'expired', { timestamp: 0, ttl: 1 });
      await w.seed(shell, '/sentinel', 'shell');
      await w.seed('another-app', '/sentinel', 'unrelated');
      await w.emit('message', {
        data: { type: 'UPDATE_CONFIG', payload: { cache: { [key]: 1 } } },
      });
      const cache = await w.caches.open(media[index]);
      expect(await cache.match(stale)).toBeUndefined();
      expect(await cache.match(old)).toBeDefined();
      expect(
        await (await w.emit('fetch', { request: request(fresh) })).text()
      ).toBe('network');
      expect(await cache.match(old)).toBeUndefined();
      expect((await cache.keys()).map(x => x.url)).toEqual([origin + fresh]);
      expect(
        await (await (await w.caches.open(shell)).match('/sentinel')).text()
      ).toBe('shell');
      expect(
        await (
          await (await w.caches.open('another-app')).match('/sentinel')
        ).text()
      ).toBe('unrelated');
    }
  );

  it('zero non-audio capacity preserves delivery without retaining entries', async () => {
    const w = worker();
    await w.emit('message', {
      data: {
        type: 'UPDATE_CONFIG',
        payload: { cache: { maxThumbnailEntries: 0 } },
      },
    });
    expect(
      await (
        await w.emit('fetch', { request: request('/media/covers/new.png') })
      ).text()
    ).toBe('network');
    expect(await (await w.caches.open(media[1])).keys()).toEqual([]);
  });

  it.each([-1, 0.5, NaN, Infinity])(
    'ignores invalid entry capacity %s',
    async invalid => {
      const w = worker();
      for (const value of [1, invalid]) {
        await w.emit('message', {
          data: {
            type: 'UPDATE_CONFIG',
            payload: { cache: { maxMetadataEntries: value } },
          },
        });
      }
      await w.emit('fetch', { request: request('/media/metadata/first.json') });
      await w.emit('fetch', {
        request: request('/media/metadata/second.json'),
      });
      expect(
        (await (await w.caches.open(media[3])).keys()).map(x => x.url)
      ).toEqual([origin + '/media/metadata/second.json']);
    }
  );

  it('uses the resolver absolute local media root under a site subpath', async () => {
    const w = worker('sw.js', { base: '/a-mavs-olevm' });
    await w.seed(media[1], '/media/covers/local.jpg', 'cached local');
    offline(w);
    expect(
      await (
        await w.emit('fetch', { request: request('/media/covers/local.jpg') })
      ).text()
    ).toBe('cached local');
  });
  it.each(['/song.mp3', '/js/main.js'])(
    'delivers the first network bytes of %s before the stream and cache write finish',
    async path => {
      const w = worker();
      let stream;
      const body = new ReadableStream({
        start(controller) {
          stream = controller;
        },
      });
      w.fetch.mockResolvedValue(new Response(body));
      const open = w.caches.open;
      w.caches.open = async name => ({
        ...(await open(name)),
        put: async (_request, response) => {
          await response.arrayBuffer();
        },
      });
      stream.enqueue(new TextEncoder().encode('first'));
      const event = w.dispatch('fetch', { request: request(path) });
      try {
        const response = await Promise.race([
          event.response,
          new Promise(resolve => setTimeout(() => resolve('blocked'), 50)),
        ]);
        expect(response).not.toBe('blocked');
        const first = await response.body.getReader().read();
        expect(new TextDecoder().decode(first.value)).toBe('first');
      } finally {
        stream.close();
        await event.response;
        await event.finish();
      }
    }
  );

  it.each(['/media/covers/old.jpg', '/media/metadata/old.json'])(
    'preserves the owned shell-cache fallback for %s',
    async path => {
      const w = worker();
      await w.seed(shell, path, 'historical');
      offline(w);
      expect(
        await (await w.emit('fetch', { request: request(path) })).text()
      ).toBe('historical');
    }
  );

  it.each(['/js/living-pantheon/data/fragments.json', '/img/interface.png'])(
    'keeps application resource %s network-first across media cache TTLs',
    async path => {
      const w = worker();
      await w.seed(media[path.endsWith('.json') ? 3 : 1], path, 'obsolete', {
        timestamp: Date.now(),
        ttl: 604800000,
      });
      expect(
        await (await w.emit('fetch', { request: request(path) })).text()
      ).toBe('network');
      expect(w.fetch).toHaveBeenCalled();
      expect(
        await (await (await w.caches.open(shell)).match(path)).text()
      ).toBe('network');
    }
  );

  it.each(['/media/covers/old.jpg', '/media/metadata/old.json'])(
    'refreshes historical shell media online at %s',
    async path => {
      const w = worker();
      await w.seed(shell, path, 'historical');
      expect(
        await (await w.emit('fetch', { request: request(path) })).text()
      ).toBe('network');
      expect(w.fetch).toHaveBeenCalled();
    }
  );

  it.each(['', '/a-mavs-olevm'])(
    'preserves both current families and unrelated data at %s',
    async base => {
      const w = worker('sw.js', { base });
      const keep = [
        shell,
        ...media,
        'another-app',
        'etceter4-v6',
        'media-cache-v2-audio',
        'etceter4-v5-backup',
        'media-cache-v1-custom',
      ];
      const stale = [
        'etceter4-v4',
        'media-cache-v0-audio',
        'media-cache-v0-metadata',
      ];
      for (const name of [...keep, ...stale])
        await w.seed(name, '/sentinel', name);
      await w.emit('activate');
      expect((await w.caches.keys()).sort()).toEqual(keep.sort());
      for (const name of keep)
        expect(
          await (await (await w.caches.open(name)).match('/sentinel')).text()
        ).toBe(name);
      expect(w.self.clients.claim).toHaveBeenCalled();
    }
  );

  it('root audio requests use network-first and the media audio store', async () => {
    const w = worker();
    const req = request('/ogod/ogodtracks/01%20I.mp3');
    expect(await (await w.emit('fetch', { request: req })).text()).toBe(
      'network'
    );
    expect(
      await (await (await w.caches.open(media[0])).match(req)).text()
    ).toBe('network');
    offline(w);
    expect(await (await w.emit('fetch', { request: req })).text()).toBe(
      'network'
    );
    expect(w.stores.get(shell)?.has(req.url)).toBeFalsy();
  });

  it.each([
    ['/media/covers/cover.png', 1],
    ['/media/waveforms/song-waveform.json', 2],
    ['/media/metadata/album.json', 3],
  ])('uses fresh cache first for %s', async (path, index) => {
    const w = worker();
    await w.seed(media[index], path, 'cached', {
      timestamp: Date.now(),
      ttl: 100000,
    });
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('cached');
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('refreshes expired thumbnails, retaining stale data offline', async () => {
    const w = worker();
    const path = '/media/covers/cover.webp';
    await w.seed(media[1], path, 'stale', { timestamp: 0, ttl: 1 });
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('network');
    await w.seed(media[1], path, 'stale', { timestamp: 0, ttl: 1 });
    offline(w);
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('stale');
  });

  it('does not satisfy media requests from unrelated cache stores', async () => {
    const w = worker();
    await w.seed('another-app', '/missing.mp3', 'wrong');
    offline(w);
    expect(
      (await w.emit('fetch', { request: request('/missing.mp3') })).status
    ).toBe(503);
  });

  it('preserves offline media already cached by the previous root implementation', async () => {
    const w = worker();
    await w.seed(shell, '/existing.mp3', 'historical audio');
    offline(w);
    expect(
      await (
        await w.emit('fetch', { request: request('/existing.mp3') })
      ).text()
    ).toBe('historical audio');
  });

  it('network media survives a rejected cache write', async () => {
    const w = worker();
    const open = w.caches.open;
    w.caches.open = async name => ({
      ...(await open(name)),
      put: async () => {
        throw new Error('quota');
      },
    });
    expect(
      await (await w.emit('fetch', { request: request('/song.mp3') })).text()
    ).toBe('network');
  });

  it.each(['/song.mp3', '/js/config.js'])(
    'preserves network %s when CacheStorage is unavailable',
    async path => {
      const w = worker();
      w.caches.open = async () => {
        throw new Error('storage denied');
      };
      expect(
        await (await w.emit('fetch', { request: request(path) })).text()
      ).toBe('network');
    }
  );

  it('zero thumbnail TTL expires immediately rather than caching forever', async () => {
    const w = worker();
    await w.seed(media[1], '/media/covers/cover.png', 'expired', {
      timestamp: 0,
      ttl: 0,
    });
    expect(
      await (
        await w.emit('fetch', { request: request('/media/covers/cover.png') })
      ).text()
    ).toBe('network');
  });

  it('handles allowed R2 CORS media with the audio strategy', async () => {
    const w = worker();
    const req = request('https://media.etceter4.com/audio/song.mp3?edition=1');
    expect(await (await w.emit('fetch', { request: req })).text()).toBe(
      'network'
    );
    offline(w);
    expect(await (await w.emit('fetch', { request: req })).text()).toBe(
      'network'
    );
    expect(await (await w.caches.open(media[0])).match(req)).toBeDefined();
  });

  it('passes opaque R2 media through without reconstructing or storing it', async () => {
    const w = worker();
    const opaque = new Response(null);
    Object.defineProperty(opaque, 'type', { value: 'opaque' });
    Object.defineProperty(opaque, 'status', { value: 0 });
    w.fetch.mockResolvedValue(opaque);
    const req = request('https://media.etceter4.com/cover.png', {
      mode: 'no-cors',
    });
    expect(await w.emit('fetch', { request: req })).toBe(opaque);
    expect(await (await w.caches.open(media[1])).match(req)).toBeUndefined();
  });

  it('enforces the audio byte limit even without Content-Length', async () => {
    const w = worker();
    await w.emit('message', {
      data: {
        type: 'UPDATE_CONFIG',
        payload: { cache: { maxAudioCacheSize: 5 } },
      },
      ports: [],
    });
    await w.seed(media[0], '/old.mp3', 'old', { timestamp: 1 });
    await w.emit('fetch', { request: request('/new.mp3') });
    const cache = await w.caches.open(media[0]);
    expect(await cache.match('/old.mp3')).toBeUndefined();
    expect(await cache.match('/new.mp3')).toBeUndefined(); // 7-byte response exceeds cap
  });

  it.each([
    '/film.mp4',
    '/film.webm',
    '/master.m3u8',
    '/segment.ts',
    '/segment.m4s',
    '/subtitles.vtt',
  ])('streams %s without caching', async path => {
    const w = worker();
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('network');
    expect(await w.caches.keys()).toEqual([]);
  });

  it('preserves live range responses and never caches 206 as complete audio', async () => {
    const w = worker();
    w.fetch.mockResolvedValue(
      new Response('23', {
        status: 206,
        headers: { 'Content-Range': 'bytes 2-3/6' },
      })
    );
    const response = await w.emit('fetch', {
      request: request('/song.mp3', { headers: { Range: 'bytes=2-3' } }),
    });
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 2-3/6');
    expect(
      await (await w.caches.open(media[0])).match('/song.mp3')
    ).toBeUndefined();
  });

  it.each([
    ['bytes=2-3', 206, '23'],
    ['bytes=-2', 206, '45'],
    ['bytes=3-', 206, '345'],
    ['bytes=9-', 416, ''],
  ])('serves offline audio ranges %s', async (range, status, body) => {
    const w = worker();
    await w.seed(media[0], '/song.mp3', '012345');
    offline(w);
    const response = await w.emit('fetch', {
      request: request('/song.mp3', { headers: { Range: range } }),
    });
    expect(response.status).toBe(status);
    expect(await response.text()).toBe(body);
    expect(response.headers.get('Content-Range')).toMatch(/\/6$/);
  });

  it('keeps navigation fallback and chamber fragments offline under a subpath', async () => {
    const w = worker('sw.js', { base: '/a-mavs-olevm' });
    await w.emit('install');
    const path = '/a-mavs-olevm/chambers/odeion/fragment.html';
    await w.emit('fetch', { request: request(path) });
    // Flush the baseline worker's untracked cache-write microtask too.
    await new Promise(resolve => setImmediate(resolve));
    offline(w);
    expect(
      await (await w.emit('fetch', { request: request(path) })).text()
    ).toBe('network');
    expect(
      await (
        await w.emit('fetch', {
          request: {
            url: origin + '/a-mavs-olevm/new',
            method: 'GET',
            mode: 'navigate',
            headers: new Headers(),
          },
        })
      ).text()
    ).toContain('/a-mavs-olevm/offline.html');
  });

  it('ignores non-GET, unrelated origins, and large original photographs', async () => {
    const w = worker();
    for (const req of [
      request('/song.mp3', { method: 'POST' }),
      request('https://unrelated.example/song.mp3'),
      request('/img/photos/original.jpg'),
    ]) {
      expect(await w.emit('fetch', { request: req })).toBeUndefined();
    }
  });

  it('CLEAR_ALL_CACHES clears only media, without requiring a reply port', async () => {
    const w = worker();
    for (const name of [shell, ...media, 'another-app'])
      await w.seed(name, '/sentinel', name);
    await w.emit('message', { data: { type: 'CLEAR_ALL_CACHES' }, ports: [] });
    expect((await w.caches.keys()).sort()).toEqual(
      [shell, 'another-app'].sort()
    );
  });
});

it('legacy worker unregisters without claiming clients or touching any caches', async () => {
  const w = worker('js/media/cache/MediaServiceWorker.js');
  for (const name of [shell, ...media, 'another-app', 'media-cache-v0-audio'])
    await w.seed(name, '/sentinel', name);
  const before = await w.caches.keys();
  await w.emit('install');
  await w.emit('activate');
  expect(w.self.registration.unregister).toHaveBeenCalled();
  expect(w.self.clients.claim).not.toHaveBeenCalled();
  expect(await w.caches.keys()).toEqual(before);
  expect(
    await w.emit('fetch', { request: request('/song.mp3') })
  ).toBeUndefined();
});
