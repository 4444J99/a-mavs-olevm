/** Startup regressions execute the shipped entry point and independent fallback. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const main = readFileSync(resolve(__dirname, '../../js/main.js'), 'utf8');
const fallback = readFileSync(
  resolve(__dirname, '../../js/runtimeFallback.js'),
  'utf8'
);

function runtime({
  hash = '',
  missingData = false,
  missingJQuery = false,
  missingDependency = null,
  searchLoad = () => Promise.resolve(),
  initialize = () => Promise.resolve(),
  initializeHome = () => Promise.resolve(),
} = {}) {
  const doc = document.implementation.createHTMLDocument('Startup');
  doc.body.innerHTML =
    '<section id="visual-home" class="dn"></section><section id="landing" class="dn"></section><section id="bibliotheke" class="dn"></section>';
  const win = new EventTarget();
  Object.assign(win, {
    location: { hash, reload: vi.fn() },
    setTimeout,
    clearTimeout,
  });
  const landing = { id: '#landing', initPage: vi.fn(() => Promise.resolve()) };
  const home = { id: '#visual-home', initPage: vi.fn(initializeHome) };
  const chamber = { id: '#bibliotheke', initPage: vi.fn(initialize) };
  class Page {
    static findPage(id) {
      if (missingData) throw new ReferenceError('pages is not defined');
      const page = [landing, chamber, home].find(page => page.id === id);
      if (!page) throw new Error('Page not found');
      return page;
    }
  }
  let ready;
  const jquery = selector => {
    if (selector === doc)
      return {
        ready(callback) {
          ready = callback;
        },
      };
    const element = doc.querySelector(selector);
    const wrapper = {
      removeClass(name) {
        element?.classList.remove(name);
        return wrapper;
      },
      addClass(name) {
        element?.classList.add(name);
        return wrapper;
      },
    };
    return wrapper;
  };
  win.jQuery = jquery;
  const pantheon = vi.fn();
  const recover = vi.fn();
  const log = { error: vi.fn(), warn: vi.fn(), log: vi.fn() };
  new Function('document', 'window', fallback)(doc, win);
  const startMain = () =>
    new Function(
      'document',
      'window',
      'navigator',
      '$',
      'Page',
      'initializeLivingPantheon',
      'recover',
      'showNewSection',
      'console',
      'CustomEvent',
      'ETCETER4_CONFIG',
      'ChamberLoader',
      'ScriptLoader',
      `let currentPage = null;
     function recoverNavigation(error, previous, target) {
       currentPage = previous;
       document.querySelector(previous.id).classList.remove('dn');
       recover(error, previous, target);
     }
     ${main}
     return () => currentPage;`
    )(
      doc,
      win,
      {},
      missingJQuery ? undefined : jquery,
      Page,
      pantheon,
      recover,
      vi.fn(),
      log,
      CustomEvent,
      missingDependency === 'config'
        ? undefined
        : {
            animations: {
              fadeInDuration: 300,
              fadeOutDuration: 300,
              fadeOutDelay: 0,
              transitionCooldown: 50,
            },
          },
      missingDependency === 'chamberLoader'
        ? undefined
        : {
            getInstance: () => ({ ensureLoaded: searchLoad }),
          },
      missingDependency === 'scriptLoader'
        ? undefined
        : {
            loadSequence: vi.fn(),
          }
    );
  return {
    doc,
    win,
    Page,
    landing,
    home,
    chamber,
    pantheon,
    recover,
    startMain,
    domReady: () => doc.dispatchEvent(new Event('DOMContentLoaded')),
    runReady: () => ready?.(),
    panel: () => doc.getElementById('runtime-fallback'),
  };
}

async function settle() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

afterEach(() => vi.useRealTimers());

describe('production startup contract', () => {
  it.each(['config', 'chamberLoader', 'scriptLoader'])(
    'exposes recovery when the core %s dependency is missing',
    async missingDependency => {
      const app = runtime({ missingDependency });
      app.startMain();
      app.domReady();
      app.runReady();
      await settle();
      expect(app.win.etceter4Startup.status).toBe('failed');
      expect(app.panel()).not.toBeNull();
      expect(app.pantheon).not.toHaveBeenCalled();
    }
  );

  it('reports search failure without rolling back an in-flight chamber transition', async () => {
    let release;
    const app = runtime({
      hash: '#bibliotheke',
      initialize: () =>
        new Promise(resolve => {
          release = resolve;
        }),
      searchLoad: () => Promise.reject(new Error('Discovery unavailable')),
    });
    const current = app.startMain();
    app.runReady();
    await settle();
    const before = current();
    app.doc.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    );
    await settle();
    expect(app.recover).not.toHaveBeenCalled();
    expect(current()).toBe(before);
    expect(app.win.etceter4Startup.status).toBe('starting');
    expect(app.doc.getElementById('search-error')?.getAttribute('role')).toBe(
      'alert'
    );
    release();
    await settle();
    expect(app.win.etceter4Startup).toEqual({
      status: 'ready',
      route: '#bibliotheke',
    });
  });

  it('shows recovery when main.js never executes even though jQuery and Page loaded', () => {
    const app = runtime();
    expect(typeof app.win.jQuery).toBe('function');
    expect(typeof app.Page).toBe('function');
    app.domReady();
    expect(app.panel()?.getAttribute('role')).toBe('alert');
    expect(app.panel().querySelector('a').getAttribute('href')).toBe(
      'OGOD.html'
    );
    expect(app.panel().style.background).toBe('rgb(255, 255, 255)');
    app.domReady();
    expect(app.doc.querySelectorAll('#runtime-fallback')).toHaveLength(1);
  });

  it('reports missing pageData.js through the independent fallback', async () => {
    const app = runtime({ missingData: true });
    app.startMain();
    app.domReady();
    expect(app.panel()).toBeNull();
    app.runReady();
    await settle();
    expect(app.win.etceter4Startup.status).toBe('failed');
    expect(app.panel()).not.toBeNull();
    expect(app.pantheon).not.toHaveBeenCalled();
  });

  it('reports missing jQuery without inventing a replacement API', () => {
    const app = runtime({ missingJQuery: true });
    app.startMain();
    expect(app.win.etceter4Startup.status).toBe('failed');
    expect(app.panel()).not.toBeNull();
  });

  it.each(['', '#unknown'])(
    'initializes the visible default route for %j',
    async hash => {
      const app = runtime({ hash });
      app.startMain();
      app.domReady();
      app.runReady();
      await settle();
      expect(app.win.etceter4Startup).toEqual({
        status: 'ready',
        route: '#visual-home',
      });
      expect(
        app.doc.getElementById('visual-home').classList.contains('dn')
      ).toBe(false);
      expect(app.pantheon).toHaveBeenCalledExactlyOnceWith('#visual-home');
      expect(app.panel()).toBeNull();
    }
  );

  it('waits for the default gallery before reporting ready', async () => {
    let release;
    const app = runtime({
      initializeHome: () =>
        new Promise(resolve => {
          release = resolve;
        }),
    });
    app.startMain();
    app.runReady();
    await settle();
    expect(app.win.etceter4Startup.status).toBe('starting');
    expect(app.home.initPage).toHaveBeenCalledOnce();
    release();
    await settle();
    expect(app.win.etceter4Startup).toEqual({
      status: 'ready',
      route: '#visual-home',
    });
  });

  it('recovers to landing when the default gallery cannot load', async () => {
    const error = new Error('Manifest unavailable');
    const app = runtime({ initializeHome: () => Promise.reject(error) });
    const current = app.startMain();
    app.runReady();
    await settle();
    expect(app.recover).toHaveBeenCalledExactlyOnceWith(
      error,
      app.landing,
      '#visual-home'
    );
    expect(current()).toBe(app.landing);
    expect(app.win.etceter4Startup).toEqual({
      status: 'ready',
      route: '#landing',
    });
  });

  it('waits for actual asynchronous initialization before reporting ready', async () => {
    let release;
    const app = runtime({
      hash: '#bibliotheke',
      initialize: () =>
        new Promise(resolve => {
          release = resolve;
        }),
    });
    app.startMain();
    app.domReady();
    app.runReady();
    await settle();
    expect(app.win.etceter4Startup.status).toBe('starting');
    expect(app.panel()).toBeNull();
    expect(app.pantheon).not.toHaveBeenCalled();
    release();
    await settle();
    expect(app.win.etceter4Startup).toEqual({
      status: 'ready',
      route: '#bibliotheke',
    });
    expect(app.pantheon).toHaveBeenCalledExactlyOnceWith('#bibliotheke');
  });

  it.each(['rejection', 'throw'])(
    'finishes Living Pantheon startup on landing after an initial chamber %s',
    async kind => {
      const error = new Error('Fragment unavailable');
      const app = runtime({
        hash: '#bibliotheke',
        initialize: () => {
          if (kind === 'throw') throw error;
          return Promise.reject(error);
        },
      });
      const current = app.startMain();
      app.domReady();
      app.runReady();
      await settle();
      expect(app.recover).toHaveBeenCalledExactlyOnceWith(
        error,
        app.landing,
        '#bibliotheke'
      );
      expect(current()).toBe(app.landing);
      expect(app.pantheon).toHaveBeenCalledExactlyOnceWith('#landing');
      expect(app.win.etceter4Startup).toEqual({
        status: 'ready',
        route: '#landing',
      });
      expect(app.panel()).toBeNull();
    }
  );

  it('makes hung startup recoverable and removes recovery when startup later succeeds', async () => {
    vi.useFakeTimers();
    let release;
    const app = runtime({
      hash: '#bibliotheke',
      initialize: () =>
        new Promise(resolve => {
          release = resolve;
        }),
    });
    app.startMain();
    app.domReady();
    app.runReady();
    await settle();
    vi.advanceTimersByTime(29999);
    expect(app.panel()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(app.panel()).not.toBeNull();
    release();
    await settle();
    expect(app.win.etceter4Startup.status).toBe('ready');
    expect(app.panel()).toBeNull();
  });
});
