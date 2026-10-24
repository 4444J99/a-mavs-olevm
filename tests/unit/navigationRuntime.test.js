/** Regression tests execute the shipped Page source, not a copied class. */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../../js/page.js'), 'utf8');

function runtime(loader = { isRegistered: () => false }) {
  const doc = document.implementation.createHTMLDocument('Navigation test');
  doc.body.innerHTML =
    '<section id="landing"></section><section id="menu"></section>';
  const elements = new Map();
  const jquery = selector => {
    if (!elements.has(selector)) {
      const styles = { display: selector === '#menu' ? 'none' : 'block' };
      const element = {
        length: 1,
        on: () => element,
        css(name, value) {
          if (typeof name === 'object') {
            Object.assign(styles, name);
            return element;
          }
          if (value === undefined) {
            return styles[name];
          }
          styles[name] = value;
          return element;
        },
        removeClass: () => element,
        addClass: () => element,
        find: () => ({ first: () => ({ length: 0 }) }),
        velocity(properties, options) {
          // Only the actual Velocity 2 core API is admitted by this boundary.
          if (typeof properties !== 'object') {
            throw new Error('Unsupported redirect');
          }
          options.begin();
          Object.assign(styles, properties);
          options.complete();
        },
      };
      elements.set(selector, element);
    }
    return elements.get(selector);
  };
  const win = {
    history: { replaceState: vi.fn(), pushState: vi.fn() },
    location: { hash: '#landing' },
    matchMedia: () => ({ matches: false }),
  };
  const evaluate = new Function(
    'document',
    'window',
    'navigator',
    '$',
    'ChamberLoader',
    'ETCETER4_CONFIG',
    'console',
    'setTimeout',
    `let pages = [];\n${source}\nreturn { Page, showNewSection, state: () => transitionState, current: () => currentPage, setPages: value => {pages = value; currentPage = pages[0];} };`
  );
  const result = evaluate(
    doc,
    win,
    {},
    jquery,
    { getInstance: () => loader },
    { animations: {} },
    { error: vi.fn(), warn: vi.fn() },
    callback => callback()
  );
  return { ...result, doc, win, jquery };
}

async function settle() {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
}

describe('production navigation runtime', () => {
  it('shares concurrent initialization and awaits the asynchronous initializer', async () => {
    let release;
    const initialize = vi.fn(
      () =>
        new Promise(resolve => {
          release = resolve;
        })
    );
    const { Page } = runtime();
    const page = new Page({ id: '#menu', initialize });
    const first = page.initPage();
    const second = page.initPage();
    expect(first).toBe(second);
    await settle();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(page.isInitialized).toBe(false);
    release();
    await first;
    expect(page.isInitialized).toBe(true);
    expect(page.isInitializing).toBe(false);
  });

  it('keeps a failed initializer retryable', async () => {
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error('Not ready'))
      .mockResolvedValueOnce();
    const { Page } = runtime();
    const page = new Page({ id: '#menu', initialize });
    await expect(page.initPage()).rejects.toThrow('Not ready');
    expect(page.isInitializing).toBe(false);
    expect(page.isInitialized).toBe(false);
    await page.initPage();
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(page.isInitialized).toBe(true);
  });

  it('does not initialize or mark a chamber loaded when its assets failed', async () => {
    const initialize = vi.fn();
    const ensureLoaded = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValueOnce();
    const { Page } = runtime({
      isRegistered: () => true,
      isLoaded: () => false,
      ensureLoaded,
    });
    const page = new Page({ id: '#menu', initialize });
    await expect(page.initPage()).rejects.toThrow('HTTP 503');
    expect(initialize).not.toHaveBeenCalled();
    expect(page.isInitialized).toBe(false);
    await page.initPage();
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('rolls back failed navigation and accepts the next real transition', async () => {
    const app = runtime();
    const landing = new app.Page({ id: '#landing' });
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce();
    const menu = new app.Page({ id: '#menu', initialize });
    app.setPages([landing, menu]);
    expect(app.showNewSection('#menu')).toBe(true);
    await settle();
    expect(app.state()).toBe('IDLE');
    expect(app.current()).toBe(landing);
    expect(app.win.history.pushState).not.toHaveBeenCalled();
    expect(app.win.history.replaceState).not.toHaveBeenCalled();
    expect(app.doc.querySelector('#navigation-error button').textContent).toBe(
      'Retry section'
    );
    expect(app.showNewSection('#menu')).toBe(true);
    await settle();
    expect(app.current()).toBe(menu);
    expect(app.jquery('#landing').css('display')).toBe('none');
    expect(app.jquery('#menu').css('display')).toBe('block');
    expect(app.doc.getElementById('navigation-error')).toBeNull();
  });

  it('keeps the latest click when a slow destination fails', async () => {
    const app = runtime();
    let rejectLoad;
    const landing = new app.Page({ id: '#landing' });
    const failing = new app.Page({
      id: '#failing',
      initialize: () =>
        new Promise((_, reject) => {
          rejectLoad = reject;
        }),
    });
    const menu = new app.Page({ id: '#menu' });
    app.setPages([landing, failing, menu]);
    app.showNewSection('#failing');
    await settle();
    app.showNewSection('#menu');
    rejectLoad(new Error('offline'));
    await vi.waitFor(() => expect(app.current()).toBe(menu));
    expect(app.state()).toBe('IDLE');
    expect(app.win.history.pushState.mock.calls).toEqual([[null, '', '#menu']]);
    expect(app.doc.getElementById('navigation-error')).toBeNull();
  });

  it('does not add a superseded slow destination to browser history', async () => {
    const app = runtime();
    let release;
    const landing = new app.Page({ id: '#landing' });
    const slow = new app.Page({
      id: '#slow',
      initialize: () =>
        new Promise(resolve => {
          release = resolve;
        }),
    });
    const menu = new app.Page({ id: '#menu' });
    app.setPages([landing, slow, menu]);
    app.showNewSection('#slow');
    await settle();
    app.showNewSection('#menu');
    release();
    await settle();
    expect(app.current()).toBe(menu);
    expect(app.win.history.pushState.mock.calls).toEqual([[null, '', '#menu']]);
  });

  it.each(['#stills', '#diary'])(
    'preserves %s table layout after a failed destination',
    async id => {
      const app = runtime();
      const previous = new app.Page({ id });
      const failing = new app.Page({
        id: '#menu',
        initialize: () => Promise.reject(new Error('offline')),
      });
      app.setPages([previous, failing]);
      app.win.location.hash = id;
      app.jquery(id).css('display', 'table');
      app.showNewSection('#menu');
      await settle();
      expect(app.current()).toBe(previous);
      expect(app.jquery(id).css('display')).toBe('table');
      expect(app.win.history.pushState).not.toHaveBeenCalled();
    }
  );

  it('repairs a failed browser-history destination without adding an entry', async () => {
    const app = runtime();
    const landing = new app.Page({ id: '#landing' });
    const failing = new app.Page({
      id: '#menu',
      initialize: () => Promise.reject(new Error('offline')),
    });
    app.setPages([landing, failing]);
    app.win.location.hash = '#menu';
    app.showNewSection('#menu');
    await settle();
    expect(app.win.history.pushState).not.toHaveBeenCalled();
    expect(app.win.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '#landing'
    );
  });
});

it('retains history requests while the outgoing page is still current', () => {
  const mainSource = readFileSync(
    resolve(__dirname, '../../js/main.js'),
    'utf8'
  );
  const handler = mainSource.match(
    /function handleHashChange\(\) \{[\s\S]*?\n\}/
  )?.[0];
  expect(handler).toBeTruthy();
  const request = vi.fn();
  const evaluate = new Function(
    'window',
    'currentPage',
    'Page',
    'showNewSection',
    `let isNavigating = false; ${handler}; handleHashChange();`
  );
  evaluate(
    { location: { hash: '#vision' } },
    { id: '#vision', isLoading: true },
    { findPage: () => ({ id: '#vision' }) },
    request
  );
  expect(request).toHaveBeenCalledWith('#vision');
});

it('keeps an already settled route stable without creating another transition', () => {
  const app = runtime();
  const landing = new app.Page({ id: '#landing' });
  app.setPages([landing]);
  expect(app.showNewSection('#landing')).toBe(false);
  expect(app.state()).toBe('IDLE');
  expect(app.win.history.pushState).not.toHaveBeenCalled();
});
