/**
 * Unit tests for js/worksGallery.js — the data-driven #visual-home gallery.
 * Runs in jsdom. IntersectionObserver is absent in jsdom, so the renderer's
 * fallback (eager loadImage) path is exercised, which is what we want to assert.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../js/worksGallery.js'),
  'utf8'
);

const MANIFEST = {
  version: 1,
  profile: {
    name: 'ETCETER4',
    statement: 'Photography · Video',
    instagram: 'etceter4',
  },
  works: [
    {
      id: 'a',
      src: 'img/a.jpg',
      type: 'photo',
      category: 'Photography',
      title: 'A',
      caption: 'caption a',
      tags: [],
    },
    {
      id: 'b',
      src: 'img/b.jpg',
      type: 'photo',
      category: 'Photography',
      title: 'B',
      caption: '',
      tags: [],
    },
    {
      id: 'c',
      src: 'img/c.mp4',
      poster: 'img/c.jpg',
      type: 'video',
      category: 'Generative',
      title: 'C',
      caption: '',
      tags: [],
    },
  ],
};

function setupDom() {
  document.body.innerHTML = `
    <section id="visual-home">
      <header id="works-hero">
        <h1 data-profile="name">placeholder</h1>
        <p data-profile="statement">placeholder</p>
        <a id="works-ig-link" data-profile="instagram" href="#">Instagram</a>
      </header>
      <div id="works-filters"></div>
      <div id="works-grid"></div>
    </section>`;
}

/** Re-execute the IIFE so module-level state is fresh for each test. */
function loadGallery() {
  // eslint-disable-next-line no-new-func
  new Function(SRC)();
  return window.WorksGallery;
}

function mockFetch(manifest, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => manifest,
    })
  );
}

describe('WorksGallery', () => {
  beforeEach(() => {
    setupDom();
  });

  afterEach(() => {
    window.WorksGallery?.destroy?.();
    vi.unstubAllGlobals();
    delete window.WorksGallery;
    document.body.className = '';
  });

  it('exposes an init() global', () => {
    const wg = loadGallery();
    expect(wg).toBeTruthy();
    expect(typeof wg.init).toBe('function');
  });

  it('renders one grid item per work', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const items = document.querySelectorAll('#works-grid .gallery-item');
    expect(items.length).toBe(3);
  });

  it('applies the profile to the hero and IG link', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    expect(document.querySelector('[data-profile="name"]').textContent).toBe(
      'ETCETER4'
    );
    expect(document.querySelector('#works-ig-link').getAttribute('href')).toBe(
      'https://www.instagram.com/etceter4/'
    );
  });

  it('builds a filter button per category plus All', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const btns = document.querySelectorAll(
      '#works-filters .gallery-filter-btn'
    );
    // All + Photography + Generative
    expect(btns.length).toBe(3);
  });

  it('filters the grid when a category is chosen', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const genBtn = [
      ...document.querySelectorAll('#works-filters .gallery-filter-btn'),
    ].find(b => b.getAttribute('data-category') === 'Generative');
    genBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const items = document.querySelectorAll('#works-grid .gallery-item');
    expect(items.length).toBe(1);
  });

  it('marks video works with the is-video class', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    expect(
      document.querySelectorAll('#works-grid .gallery-item.is-video').length
    ).toBe(1);
  });

  it('opens the lightbox on item click and shows a counter', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const first = document.querySelector('#works-grid .gallery-item');
    first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const lb = document.querySelector('#visual-home .lightbox');
    expect(lb.classList.contains('active')).toBe(true);
    expect(document.querySelector('.lightbox-counter').textContent).toBe(
      '1 / 3'
    );
    expect(document.body.classList.contains('lightbox-open')).toBe(true);
  });

  it('advances the lightbox with the ArrowRight key', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const first = document.querySelector('#works-grid .gallery-item');
    first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight' })
    );
    expect(document.querySelector('.lightbox-counter').textContent).toBe(
      '2 / 3'
    );
  });

  it('closes the lightbox on Escape', async () => {
    mockFetch(MANIFEST);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const first = document.querySelector('#works-grid .gallery-item');
    first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape' })
    );
    const lb = document.querySelector('#visual-home .lightbox');
    expect(lb.classList.contains('active')).toBe(false);
    expect(document.body.classList.contains('lightbox-open')).toBe(false);
  });

  it('loads the small thumbnail in the grid, with intrinsic dimensions', async () => {
    const withThumb = {
      ...MANIFEST,
      works: [
        {
          id: 'a',
          src: 'img/photos/a.jpg',
          thumb: 'img/thumbs/a.webp',
          w: 4000,
          h: 3000,
          type: 'photo',
          category: 'Photography',
          title: 'A',
          caption: '',
          tags: [],
        },
      ],
    };
    mockFetch(withThumb);
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const img = document.querySelector('#works-grid .gallery-item img');
    // The grid must use the small WebP thumbnail, never the full original.
    expect(img.getAttribute('data-src')).toBe('img/thumbs/a.webp');
    expect(img.getAttribute('width')).toBe('4000');
    expect(img.getAttribute('height')).toBe('3000');
  });

  it('falls back to the original when a work has no thumbnail', async () => {
    mockFetch(MANIFEST); // MANIFEST works carry no `thumb`
    const wg = loadGallery();
    await wg.init({ root: '#visual-home' });
    const img = document.querySelector('#works-grid .gallery-item img');
    expect(img.getAttribute('data-src')).toBe('img/a.jpg');
  });

  it('degrades gracefully when the manifest fails to load', async () => {
    mockFetch({}, false);
    const wg = loadGallery();
    await expect(wg.init({ root: '#visual-home' })).rejects.toThrow('HTTP 500');
    expect(document.querySelector('#works-grid .works-empty')).toBeTruthy();
    expect(document.querySelectorAll('#works-grid .gallery-item').length).toBe(
      0
    );
  });
});

describe('gallery lifecycle', () => {
  beforeEach(setupDom);
  afterEach(() => {
    window.WorksGallery?.destroy?.();
    vi.unstubAllGlobals();
    delete window.WorksGallery;
  });

  it('leaves native video arrow keys available for seeking', async () => {
    mockFetch(MANIFEST);
    await loadGallery().init();
    document.querySelectorAll('.gallery-item')[2].click();
    const video = document.querySelector('.lightbox video');
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      video.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(document.querySelector('.lightbox-counter').textContent).toBe(
        '3 / 3'
      );
      expect(video.isConnected).toBe(true);
    }
  });

  it('coalesces concurrent loads and retries after a rejected manifest', async () => {
    mockFetch({}, false);
    const gallery = loadGallery();
    const pending = [gallery.init(), gallery.init()];
    await Promise.allSettled(pending);
    expect(fetch).toHaveBeenCalledTimes(1);
    mockFetch(MANIFEST);
    await gallery.init();
    expect(document.querySelectorAll('.gallery-item')).toHaveLength(3);
    expect(document.querySelector('.works-empty')).toBeNull();
  });

  it('rejects malformed manifests instead of advertising an empty success', async () => {
    mockFetch({ works: {} });
    await expect(loadGallery().init()).rejects.toThrow(/manifest/i);
  });

  it('moves focus into the modal, traps Tab, and restores the opener', async () => {
    mockFetch(MANIFEST);
    await loadGallery().init();
    const opener = document.querySelector('.gallery-item');
    opener.focus();
    opener.click();
    const close = document.querySelector('.lightbox-close');
    const next = document.querySelector('.lightbox-caption');
    expect(document.activeElement).toBe(close);
    close.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(next);
    next.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(close);
    close.click();
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector('#works-grid').inert).toBe(false);
  });

  it('disconnects obsolete lazy observers on filtering and destruction', async () => {
    const observers = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor() {
          this.observe = vi.fn();
          this.disconnect = vi.fn();
          observers.push(this);
        }
      }
    );
    mockFetch(MANIFEST);
    const gallery = loadGallery();
    await gallery.init();
    document.querySelector('[data-category=Generative]').click();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    gallery.destroy();
    expect(observers[1].disconnect).toHaveBeenCalledOnce();
  });

  it('releases video and scroll lock when navigation commits another route', async () => {
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {});
    const load = vi
      .spyOn(HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => {});
    mockFetch(MANIFEST);
    await loadGallery().init();
    document.querySelectorAll('.gallery-item')[2].click();
    const video = document.querySelector('.lightbox video');
    window.dispatchEvent(
      new CustomEvent('etceter4:navigation', { detail: { route: '#landing' } })
    );
    expect(pause).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(video.querySelector('source')).toBeNull();
    expect(document.body.classList.contains('lightbox-open')).toBe(false);
    pause.mockRestore();
    load.mockRestore();
  });

  it('uses the shared HLS adapter and destroys it on close', async () => {
    const destroy = vi.fn(),
      loadSource = vi.fn().mockResolvedValue();
    vi.stubGlobal(
      'HLSLoader',
      class {
        constructor() {
          this.destroy = destroy;
          this.loadSource = loadSource;
        }
      }
    );
    mockFetch({
      ...MANIFEST,
      works: [
        { ...MANIFEST.works[2], src: 'img/photos/c/master.m3u8', hls: true },
      ],
    });
    await loadGallery().init();
    document.querySelector('.gallery-item').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(loadSource).toHaveBeenCalledWith('img/photos/c/master.m3u8');
    document.querySelector('.lightbox-close').click();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it.each(['close', 'step', 'route'])(
    'does not attach a deferred HLS load after %s',
    async action => {
      let release;
      const scripts = [
        { src: 'https://cdn.example/hls.min.js', integrity: 'preserved-pin' },
        'js/media/video/HLSLoader.js',
      ];
      const loadSequence = vi.fn(
        () =>
          new Promise(resolve => {
            release = resolve;
          })
      );
      const construct = vi.fn();
      vi.stubGlobal('ChamberLoader', {
        getInstance: () => ({ getScripts: () => scripts }),
      });
      vi.stubGlobal('ScriptLoader', { loadSequence });
      mockFetch({
        ...MANIFEST,
        works: [
          {
            ...MANIFEST.works[2],
            src: 'img/photos/video/master.m3u8',
            hls: true,
          },
          MANIFEST.works[0],
        ],
      });
      await loadGallery().init();
      document.querySelector('.gallery-item').click();
      expect(loadSequence).toHaveBeenCalledWith(scripts);
      if (action === 'close') document.querySelector('.lightbox-close').click();
      if (action === 'step')
        document.querySelector('.lightbox-nav.next').click();
      if (action === 'route')
        window.dispatchEvent(
          new CustomEvent('etceter4:navigation', {
            detail: { route: '#landing' },
          })
        );
      vi.stubGlobal('HLSLoader', construct);
      release();
      await Promise.resolve();
      await Promise.resolve();
      expect(construct).not.toHaveBeenCalled();
      expect(document.querySelector('.lightbox video')).toBeNull();
    }
  );
});
