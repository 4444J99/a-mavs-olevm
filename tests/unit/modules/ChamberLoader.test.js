/**
 * @file ChamberLoader.test.js
 * @description Unit tests for the ChamberLoader class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const scriptLoaderSource = readFileSync(
  resolve(__dirname, '../../../js/modules/ScriptLoader.js'),
  'utf-8'
);
const chamberLoaderSource = readFileSync(
  resolve(__dirname, '../../../js/modules/ChamberLoader.js'),
  'utf-8'
);

// Evaluate in jsdom context with document/window available
const cleanSL = scriptLoaderSource.replace(/^'use strict';\s*/, '');
const cleanCL = chamberLoaderSource.replace(/^'use strict';\s*/, '');

const evalSL = new Function(
  'document',
  'window',
  cleanSL + '\nreturn ScriptLoader;'
);
const evalCL = new Function(
  'document',
  'window',
  'navigator',
  'ScriptLoader',
  'fetch',
  'console',
  cleanCL + '\nreturn ChamberLoader;'
);

describe('ChamberLoader', () => {
  let ChamberLoader;
  let ScriptLoader;
  let mockFetch;

  beforeEach(() => {
    ScriptLoader = evalSL(document, window);
    ScriptLoader.reset();
    globalThis.ScriptLoader = ScriptLoader;

    mockFetch = vi.fn();
    ChamberLoader = evalCL(
      document,
      window,
      navigator,
      ScriptLoader,
      mockFetch,
      console
    );
    ChamberLoader._instance = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.ScriptLoader;
  });

  describe('getInstance()', () => {
    it('should return a singleton', () => {
      const a = ChamberLoader.getInstance();
      const b = ChamberLoader.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('register()', () => {
    it('should register a chamber manifest', () => {
      const loader = ChamberLoader.getInstance();
      loader.register('akademia', {
        html: 'chambers/akademia/fragment.html',
        scripts: ['akademia/config.js'],
        styles: ['css/akademia.css'],
      });

      expect(loader.isRegistered('akademia')).toBe(true);
      expect(loader.isRegistered('nonexistent')).toBe(false);
    });

    it('should default scripts and styles to empty arrays', () => {
      const loader = ChamberLoader.getInstance();
      loader.register('test', { html: 'test.html' });

      expect(loader._manifests.get('test').scripts).toEqual([]);
      expect(loader._manifests.get('test').styles).toEqual([]);
    });
  });

  describe('isLoaded()', () => {
    it('should return false for unloaded chambers', () => {
      const loader = ChamberLoader.getInstance();
      loader.register('test', { html: 'test.html' });
      expect(loader.isLoaded('test')).toBe(false);
    });
  });

  describe('ensureLoaded()', () => {
    it('should fetch HTML fragment and inject into element', async () => {
      const section = document.createElement('section');
      section.id = 'test-chamber';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('test-chamber', {
        html: 'chambers/test/fragment.html',
        scripts: [],
        styles: [],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<div>Test content</div>'),
      });

      await loader.ensureLoaded('test-chamber');

      expect(section.innerHTML).toBe('<div>Test content</div>');
      expect(loader.isLoaded('test-chamber')).toBe(true);

      document.body.removeChild(section);
    });

    it('should be idempotent — second call returns same promise', async () => {
      const section = document.createElement('section');
      section.id = 'idem';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('idem', {
        html: 'chambers/idem/fragment.html',
        scripts: [],
        styles: [],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<p>content</p>'),
      });

      const p1 = loader.ensureLoaded('idem');
      const p2 = loader.ensureLoaded('idem');
      expect(p1).toBe(p2);

      await p1;
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // After completion, should resolve immediately
      await loader.ensureLoaded('idem');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      document.body.removeChild(section);
    });

    it('should skip fetch when element already has content', async () => {
      const section = document.createElement('section');
      section.id = 'has-content';
      section.innerHTML = '<div>Inline content</div>';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('has-content', {
        html: 'chambers/has-content/fragment.html',
        scripts: [],
        styles: [],
      });

      await loader.ensureLoaded('has-content');

      expect(section.innerHTML).toBe('<div>Inline content</div>');
      expect(loader.isLoaded('has-content')).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();

      document.body.removeChild(section);
    });

    it('should leave the fragment empty and retryable when fetch fails', async () => {
      const section = document.createElement('section');
      section.id = 'error-chamber';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('error-chamber', {
        html: 'chambers/error/fragment.html',
        scripts: [],
        styles: [],
      });

      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(loader.ensureLoaded('error-chamber')).rejects.toThrow('404');
      expect(section.innerHTML).toBe('');
      expect(loader.isLoaded('error-chamber')).toBe(false);

      document.body.removeChild(section);
    });

    it('retries a failed fetch without treating error UI as a loaded fragment', async () => {
      const section = document.createElement('section');
      section.id = 'retry-chamber';
      document.body.appendChild(section);
      const loader = ChamberLoader.getInstance();
      loader.register('retry-chamber', { html: 'chambers/retry.html' });
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '<p>Recovered work</p>',
        });
      await expect(loader.ensureLoaded('retry-chamber')).rejects.toThrow('503');
      await loader.ensureLoaded('retry-chamber');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(section.textContent).toBe('Recovered work');
      expect(loader.isLoaded('retry-chamber')).toBe(true);
      section.remove();
    });

    it('does not confuse a fetched fragment with successfully loaded scripts', async () => {
      const section = document.createElement('section');
      section.id = 'script-retry';
      document.body.appendChild(section);
      const loader = ChamberLoader.getInstance();
      loader.register('script-retry', {
        html: 'chambers/retry.html',
        scripts: ['required.js'],
      });
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<p>Preserved fragment</p>',
      });
      const scripts = vi
        .spyOn(ScriptLoader, 'loadSequence')
        .mockRejectedValueOnce(new Error('Script unavailable'))
        .mockResolvedValueOnce();
      await expect(loader.ensureLoaded('script-retry')).rejects.toThrow(
        'Script unavailable'
      );
      expect(loader.isLoaded('script-retry')).toBe(false);
      expect(section.textContent).toBe('Preserved fragment');
      await loader.ensureLoaded('script-retry');
      expect(scripts).toHaveBeenCalledTimes(2);
      expect(loader.isLoaded('script-retry')).toBe(true);
      section.remove();
    });

    it('should throw for unregistered chamber', async () => {
      const loader = ChamberLoader.getInstance();
      await expect(loader.ensureLoaded('nonexistent')).rejects.toThrow(
        'no manifest for "nonexistent"'
      );
    });

    it('should load scripts after fragment injection', async () => {
      const section = document.createElement('section');
      section.id = 'scripted';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('scripted', {
        html: 'chambers/scripted/fragment.html',
        scripts: ['lib-a.js', 'lib-b.js'],
        styles: [],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<div>Fragment</div>'),
      });

      const origLoadSeq = ScriptLoader.loadSequence;
      ScriptLoader.loadSequence = vi.fn(async () => {});

      await loader.ensureLoaded('scripted');

      expect(ScriptLoader.loadSequence).toHaveBeenCalledWith([
        'lib-a.js',
        'lib-b.js',
      ]);

      ScriptLoader.loadSequence = origLoadSeq;
      document.body.removeChild(section);
    });

    it('should inject CSS stylesheets', async () => {
      const section = document.createElement('section');
      section.id = 'styled';
      document.body.appendChild(section);

      const loader = ChamberLoader.getInstance();
      loader.register('styled', {
        html: 'chambers/styled/fragment.html',
        scripts: [],
        styles: ['css/test-style.css'],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<div>Styled</div>'),
      });

      await loader.ensureLoaded('styled');

      const link = document.querySelector('link[href="css/test-style.css"]');
      expect(link).not.toBeNull();
      expect(link.rel).toBe('stylesheet');

      document.body.removeChild(section);
      link.remove();
    });
  });

  describe('preload()', () => {
    it('should fetch fragment without marking as loaded', async () => {
      const loader = ChamberLoader.getInstance();
      loader.register('preload-test', {
        html: 'chambers/preload/fragment.html',
        scripts: ['heavy.js'],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<div>preloaded</div>'),
      });

      await loader.preload('preload-test');

      expect(mockFetch).toHaveBeenCalledWith('chambers/preload/fragment.html');
      expect(loader.isLoaded('preload-test')).toBe(false);
    });

    it('should skip preload if already loaded', async () => {
      const loader = ChamberLoader.getInstance();
      loader._loaded.add('already');
      loader.register('already', { html: 'x.html' });

      await loader.preload('already');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('should clear all state and destroy singleton', () => {
      const loader = ChamberLoader.getInstance();
      loader.register('test', { html: 'x.html' });
      loader._loaded.add('test');

      loader.reset();

      expect(loader._manifests.size).toBe(0);
      expect(loader._loaded.size).toBe(0);
      expect(ChamberLoader._instance).toBeNull();
    });
  });
});
