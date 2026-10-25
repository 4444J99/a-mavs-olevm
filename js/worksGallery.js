'use strict';

/**
 * @file worksGallery.js
 * @description Data-driven works gallery for the #visual-home front door.
 *
 * Renders the photographic / video / multimedia / generative work from
 * `data/works.json` into the existing gallery.css class API (grid · caption ·
 * filters · lightbox · lazy-load). The browser cannot list directories, so the
 * manifest is the single source of truth — seed it with `scripts/seed-works.mjs`
 * and grow it with `scripts/ingest-media.mjs`.
 *
 * Global: `WorksGallery.init({ root })`. Idempotent. No external dependencies
 * (vanilla DOM); jQuery is present on the page but intentionally not required.
 *
 * @global WorksGallery
 */

(function () {
  const MANIFEST_URL = 'data/works.json';

  const state = {
    initialized: false,
    works: [],
    filtered: [],
    activeCategory: 'all',
    lightboxIndex: -1,
  };

  const els = {};
  const imageSources = new WeakMap();
  let initPromise = null;
  let gridObserver = null;
  let hlsLoader = null;
  let mediaGeneration = 0;
  let opener = null;
  let inertElements = [];

  function init(options) {
    if (state.initialized) {
      return Promise.resolve();
    }
    if (!initPromise) {
      initPromise = initialize(options).finally(() => {
        initPromise = null;
      });
    }
    return initPromise;
  }

  /**
   * Tiny element builder. `attrs.text` sets textContent; other keys map to
   * attributes (null/undefined skipped).
   */
  function h(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) {
          continue;
        }
        if (key === 'text') {
          node.textContent = value;
        } else {
          node.setAttribute(key, value);
        }
      }
    }
    return node;
  }

  async function initialize(options) {
    const opts = options || {};
    const root = document.querySelector(opts.root || '#visual-home');
    if (!root) {
      throw new Error('Works gallery root unavailable');
    }
    els.root = root;
    els.hero = root.querySelector('#works-hero');
    els.filters = root.querySelector('#works-filters');
    els.grid = root.querySelector('#works-grid');
    if (!els.grid) {
      throw new Error('Works gallery grid unavailable');
    }

    let manifest;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      manifest = await res.json();
      if (
        !Array.isArray(manifest?.works) ||
        manifest.works.some(
          work =>
            !work || typeof work.id !== 'string' || typeof work.src !== 'string'
        )
      ) {
        throw new Error('Invalid works manifest');
      }
    } catch (err) {
      console.error('WorksGallery: could not load manifest', err);
      els.grid.replaceChildren(
        h('p', 'works-empty', {
          role: 'alert',
          text: 'The gallery could not load. Return to retry.',
        })
      );
      throw err;
    }

    state.works = Array.isArray(manifest.works) ? manifest.works : [];
    state.filtered = state.works.slice();
    applyProfile(manifest.profile);
    buildFilters();
    buildLightbox();
    renderGrid();
    state.initialized = true;
    window.addEventListener('etceter4:navigation', onNavigation);
  }

  function applyProfile(profile) {
    if (!profile || !els.hero) {
      return;
    }
    const name = els.hero.querySelector('[data-profile="name"]');
    const statement = els.hero.querySelector('[data-profile="statement"]');
    const ig = els.hero.querySelector('[data-profile="instagram"]');
    if (name && profile.name) {
      name.textContent = profile.name;
    }
    if (statement && profile.statement) {
      statement.textContent = profile.statement;
    }
    if (ig) {
      if (profile.instagram) {
        ig.setAttribute(
          'href',
          `https://www.instagram.com/${profile.instagram}/`
        );
        ig.classList.remove('dn');
      } else {
        ig.classList.add('dn');
      }
    }
  }

  function categories() {
    const seen = [];
    for (const work of state.works) {
      if (work.category && !seen.includes(work.category)) {
        seen.push(work.category);
      }
    }
    return seen;
  }

  function buildFilters() {
    if (!els.filters) {
      return;
    }
    els.filters.textContent = '';
    const cats = ['all'].concat(categories());
    // One real category → a filter bar adds noise, not signal.
    if (cats.length <= 2) {
      els.filters.classList.add('dn');
      return;
    }
    els.filters.classList.remove('dn');
    for (const cat of cats) {
      const btn = h('button', 'gallery-filter-btn', {
        type: 'button',
        'data-category': cat,
        text: cat === 'all' ? 'All' : cat,
      });
      if (cat === state.activeCategory) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => setFilter(cat));
      els.filters.appendChild(btn);
    }
  }

  function setFilter(cat) {
    state.activeCategory = cat;
    if (els.filters) {
      els.filters.querySelectorAll('.gallery-filter-btn').forEach(btn => {
        btn.classList.toggle(
          'active',
          btn.getAttribute('data-category') === cat
        );
      });
    }
    state.filtered =
      cat === 'all'
        ? state.works.slice()
        : state.works.filter(work => work.category === cat);
    renderGrid();
  }

  function renderGrid() {
    closeLightbox(false);
    gridObserver?.disconnect();
    els.grid.textContent = '';
    const observer = (gridObserver = makeObserver());
    state.filtered.forEach((work, index) => {
      els.grid.appendChild(buildItem(work, index, observer));
    });
  }

  function makeObserver() {
    if (!('IntersectionObserver' in window)) {
      return null;
    }
    return new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadImage(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '300px' }
    );
  }

  function loadImage(container) {
    const img = container.querySelector('img');
    if (!img || img.getAttribute('src')) {
      return;
    }
    // The manifest owns the source. Rendered DOM attributes are display state,
    // never an input to a later interpretation as a resource URL.
    const src = imageSources.get(img);
    if (!src) {
      return;
    }
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      container.classList.remove('loading');
    });
    img.addEventListener('error', () => {
      container.classList.remove('loading');
    });
    img.setAttribute('src', src);
  }

  function buildItem(work, index, observer) {
    const item = h('figure', 'gallery-item', {
      'data-index': String(index),
      tabindex: '0',
      role: 'button',
      'aria-label': `Open ${work.title || 'work'}`,
    });
    if (work.type === 'video') {
      item.classList.add('is-video');
    }

    const container = h('div', 'gallery-image-container loading');
    const img = h('img', null, {
      // The grid loads the small WebP thumbnail (scripts/backfill-thumbs.mjs);
      // the lightbox loads the full-resolution original. Fall back to the
      // poster/original if a work has no generated thumbnail yet.
      'data-src': work.thumb || work.poster || work.src,
      alt: work.title || work.caption || 'Untitled work',
      decoding: 'async',
      loading: 'lazy',
      width: work.w || null,
      height: work.h || null,
    });
    imageSources.set(img, work.thumb || work.poster || work.src);
    container.appendChild(img);
    item.appendChild(container);

    const caption = h('figcaption', 'gallery-caption');
    caption.appendChild(h('h3', null, { text: work.title || '' }));
    if (work.caption) {
      caption.appendChild(h('p', null, { text: work.caption }));
    }
    if (work.category) {
      caption.appendChild(
        h('span', 'gallery-category', { text: work.category })
      );
    }
    item.appendChild(caption);

    item.addEventListener('click', () => openLightbox(index));
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(index);
      }
    });

    if (observer) {
      observer.observe(container);
    } else {
      loadImage(container);
    }
    return item;
  }

  // ── Lightbox ───────────────────────────────────────────────
  function buildLightbox() {
    if (els.lightbox) {
      return;
    }
    const lb = h('div', 'lightbox', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Work viewer',
    });
    const content = h('div', 'lightbox-content');
    const close = h('button', 'lightbox-close', {
      type: 'button',
      'aria-label': 'Close viewer',
      text: '×',
    });
    const prev = h('button', 'lightbox-nav prev', {
      type: 'button',
      'aria-label': 'Previous work',
      text: '‹',
    });
    const next = h('button', 'lightbox-nav next', {
      type: 'button',
      'aria-label': 'Next work',
      text: '›',
    });
    const media = h('div', 'lightbox-image-container');
    const caption = h('div', 'lightbox-caption', {
      tabindex: '0',
      role: 'region',
      'aria-label': 'Work details',
    });
    const counter = h('div', 'lightbox-counter');

    content.appendChild(close);
    content.appendChild(prev);
    content.appendChild(next);
    content.appendChild(media);
    content.appendChild(caption);
    content.appendChild(counter);
    lb.appendChild(content);
    els.root.appendChild(lb);

    close.addEventListener('click', closeLightbox);
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    lb.addEventListener('click', event => {
      if (event.target === lb) {
        closeLightbox();
      }
    });
    document.addEventListener('keydown', onKey);

    els.lightbox = lb;
    els.lbMedia = media;
    els.lbCaption = caption;
    els.lbCounter = counter;
  }

  function onKey(event) {
    if (!els.lightbox || !els.lightbox.classList.contains('active')) {
      return;
    }
    if (event.key === 'Tab') {
      const controls = [
        ...els.lightbox.querySelectorAll(
          'button, a[href], video[controls], [tabindex="0"]'
        ),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      if (
        event.target.closest?.(
          'video, audio, input, textarea, select, [contenteditable]'
        )
      ) {
        return;
      }
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      if (
        event.target.closest?.(
          'video, audio, input, textarea, select, [contenteditable]'
        )
      ) {
        return;
      }
      event.preventDefault();
      step(1);
    }
  }

  function openLightbox(index) {
    if (!els.lightbox.classList.contains('active')) {
      opener = document.activeElement;
      for (
        let node = els.lightbox;
        node.parentElement;
        node = node.parentElement
      ) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node) {
            inertElements.push([sibling, Boolean(sibling.inert)]);
            sibling.inert = true;
          }
        }
        if (node.parentElement === document.body) {
          break;
        }
      }
    }
    state.lightboxIndex = index;
    renderLightbox();
    els.lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
    els.lightbox.querySelector('.lightbox-close').focus();
  }

  function closeLightbox(restoreFocus = true) {
    if (!els.lightbox) {
      return;
    }
    els.lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    releaseMedia();
    inertElements.forEach(([element, inert]) => {
      element.inert = inert;
    });
    inertElements = [];
    if (restoreFocus && opener?.isConnected) {
      opener.focus();
    }
    opener = null;
  }

  function onNavigation(event) {
    if (event.detail?.route !== '#visual-home') {
      closeLightbox(false);
    }
  }

  function releaseMedia() {
    mediaGeneration += 1;
    hlsLoader?.destroy();
    hlsLoader = null;
    const video = els.lbMedia?.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.replaceChildren();
      video.load();
    }
    if (els.lbMedia) {
      els.lbMedia.textContent = '';
    }
  }

  function destroy() {
    closeLightbox(false);
    gridObserver?.disconnect();
    gridObserver = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('etceter4:navigation', onNavigation);
    els.lightbox?.remove();
    Object.keys(els).forEach(key => {
      delete els[key];
    });
    state.initialized = false;
  }

  function step(delta) {
    const count = state.filtered.length;
    if (!count) {
      return;
    }
    state.lightboxIndex = (state.lightboxIndex + delta + count) % count;
    renderLightbox();
  }

  function renderLightbox() {
    const work = state.filtered[state.lightboxIndex];
    if (!work) {
      return;
    }
    releaseMedia();
    if (work.type === 'video') {
      const video = h('video', null, {
        controls: 'controls',
        playsinline: 'playsinline',
        preload: 'metadata',
        poster: work.poster || null,
      });
      els.lbMedia.appendChild(video);
      if (work.hls || /\.m3u8(?:[?#]|$)/i.test(work.src)) {
        loadHls(video, work.src, mediaGeneration);
      } else {
        video.appendChild(h('source', null, { src: work.src }));
      }
    } else {
      els.lbMedia.appendChild(
        h('img', null, { src: work.src, alt: work.title || 'Work' })
      );
    }

    els.lbCaption.textContent = '';
    if (work.title) {
      els.lbCaption.appendChild(h('h2', null, { text: work.title }));
    }
    if (work.caption) {
      els.lbCaption.appendChild(h('p', null, { text: work.caption }));
    }
    if (work.ig_url) {
      els.lbCaption.appendChild(
        h('a', 'lightbox-ig-link', {
          href: work.ig_url,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'View on Instagram →',
        })
      );
    }
    if (work.category) {
      els.lbCaption.appendChild(
        h('span', 'lightbox-category', { text: work.category })
      );
    }
    els.lbCounter.textContent = `${state.lightboxIndex + 1} / ${state.filtered.length}`;
  }

  async function loadHls(video, src, generation) {
    try {
      if (!window.HLSLoader) {
        const scripts = ChamberLoader.getInstance()
          .getScripts('video')
          .filter(script =>
            /hls\.min\.js|\/HLSLoader\.js/.test(
              typeof script === 'string' ? script : script.src
            )
          );
        if (scripts.length !== 2) {
          throw new Error('HLS dependencies unavailable');
        }
        await ScriptLoader.loadSequence(scripts);
      }
      if (generation !== mediaGeneration) {
        return;
      }
      hlsLoader = new window.HLSLoader(video);
      await hlsLoader.loadSource(src);
    } catch (error) {
      if (generation !== mediaGeneration) {
        return;
      }
      hlsLoader?.destroy();
      hlsLoader = null;
      els.lbMedia.appendChild(
        h('p', 'works-empty', {
          role: 'alert',
          text: 'This video could not load.',
        })
      );
      console.warn('WorksGallery: HLS unavailable', error);
    }
  }

  window.WorksGallery = { init, destroy, close: closeLightbox };
})();
