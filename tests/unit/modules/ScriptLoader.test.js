/**
 * @file ScriptLoader.test.js
 * @description Unit tests for the ScriptLoader utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const scriptLoaderSource = readFileSync(
  resolve(__dirname, '../../../js/modules/ScriptLoader.js'),
  'utf-8'
);

// Evaluate in the global (jsdom) context so `document` is available
// Strip 'use strict' since we need to assign to global
const cleanSource = scriptLoaderSource.replace(/^'use strict';\s*/, '');
const evalScript = new Function(
  'document',
  'window',
  cleanSource + '\nreturn ScriptLoader;'
);

describe('ScriptLoader', () => {
  let ScriptLoader;

  beforeEach(() => {
    ScriptLoader = evalScript(document, window);
    ScriptLoader.reset();
    globalThis.ScriptLoader = ScriptLoader;
  });

  afterEach(() => {
    ScriptLoader.reset();
    document.querySelectorAll('script[src]').forEach(s => s.remove());
  });

  describe('load()', () => {
    it('should create a script element and append to head', () => {
      const promise = ScriptLoader.load('test-script.js');

      const script = document.querySelector('script[src="test-script.js"]');
      expect(script).not.toBeNull();
      expect(script.src).toContain('test-script.js');

      script.onload();

      return expect(promise).resolves.toBeUndefined();
    });

    it('should return the same promise for duplicate requests', () => {
      const p1 = ScriptLoader.load('dup.js');
      const p2 = ScriptLoader.load('dup.js');

      expect(p1).toBe(p2);

      const scripts = document.querySelectorAll('script[src*="dup.js"]');
      expect(scripts.length).toBe(1);

      scripts[0].onload();
      return expect(p1).resolves.toBeUndefined();
    });

    it('should resolve immediately if script already exists in DOM', () => {
      const existing = document.createElement('script');
      existing.src = 'existing.js';
      document.head.appendChild(existing);

      const promise = ScriptLoader.load('existing.js');
      return expect(promise).resolves.toBeUndefined();
    });

    it('should reject and clean up on error', async () => {
      const promise = ScriptLoader.load('fail.js');

      const script = document.querySelector('script[src*="fail.js"]');
      script.onerror();

      await expect(promise).rejects.toThrow('failed to load fail.js');
      expect(ScriptLoader._promises.has('fail.js')).toBe(false);
      expect(document.querySelector('script[src*="fail.js"]')).toBeNull();
      const retry = ScriptLoader.load('fail.js');
      const replacement = document.querySelector('script[src*="fail.js"]');
      expect(replacement).not.toBe(script);
      expect(ScriptLoader.isLoaded('fail.js')).toBe(false);
      replacement.onload();
      await retry;
      expect(ScriptLoader.isLoaded('fail.js')).toBe(true);
    });

    it('should set crossOrigin and integrity attributes', () => {
      ScriptLoader.load('cdn.js', {
        crossOrigin: 'anonymous',
        integrity: 'sha384-abc',
      });

      const script = document.querySelector('script[src*="cdn.js"]');
      expect(script.crossOrigin).toBe('anonymous');
      expect(script.integrity).toBe('sha384-abc');
    });
  });

  describe('loadSequence()', () => {
    it('should load scripts in order', async () => {
      const order = [];

      const origLoad = ScriptLoader.load.bind(ScriptLoader);
      ScriptLoader.load = vi.fn(src => {
        order.push(src);
        ScriptLoader._loaded.add(src);
        ScriptLoader._promises.set(src, Promise.resolve());
        return Promise.resolve();
      });

      await ScriptLoader.loadSequence(['a.js', 'b.js', 'c.js']);
      expect(order).toEqual(['a.js', 'b.js', 'c.js']);

      ScriptLoader.load = origLoad;
    });

    it('should handle object entries', async () => {
      const calls = [];
      ScriptLoader.load = vi.fn((src, opts) => {
        calls.push({ src, opts });
        return Promise.resolve();
      });

      await ScriptLoader.loadSequence([
        { src: 'lib.js', crossOrigin: 'anonymous' },
        'app.js',
      ]);

      expect(calls.length).toBe(2);
      expect(calls[0].src).toBe('lib.js');
      expect(calls[0].opts.crossOrigin).toBe('anonymous');
      expect(calls[1].src).toBe('app.js');
    });
  });

  describe('loadParallel()', () => {
    it('should load all scripts concurrently', async () => {
      const calls = [];
      ScriptLoader.load = vi.fn(src => {
        calls.push(src);
        return Promise.resolve();
      });

      await ScriptLoader.loadParallel(['x.js', 'y.js', 'z.js']);

      expect(calls).toEqual(expect.arrayContaining(['x.js', 'y.js', 'z.js']));
      expect(calls.length).toBe(3);
    });
  });

  describe('loadWithFallback()', () => {
    it('should try next URL on failure', async () => {
      let callCount = 0;
      ScriptLoader.load = vi.fn(src => {
        callCount++;
        if (src === 'primary.js') {
          return Promise.reject(new Error('CDN down'));
        }
        return Promise.resolve();
      });

      await ScriptLoader.loadWithFallback(['primary.js', 'fallback.js']);
      expect(callCount).toBe(2);
    });

    it('should throw when all fallbacks fail', async () => {
      ScriptLoader.load = vi.fn(() => Promise.reject(new Error('fail')));

      await expect(
        ScriptLoader.loadWithFallback(['a.js', 'b.js'])
      ).rejects.toThrow('fail');
    });
  });

  describe('isLoaded()', () => {
    it('should return false for unknown scripts', () => {
      expect(ScriptLoader.isLoaded('unknown.js')).toBe(false);
    });

    it('should return true after successful load', async () => {
      const promise = ScriptLoader.load('loaded.js');
      const script = document.querySelector('script[src*="loaded.js"]');
      script.onload();
      await promise;

      expect(ScriptLoader.isLoaded('loaded.js')).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should clear all state', async () => {
      const promise = ScriptLoader.load('reset-test.js');
      const script = document.querySelector('script[src*="reset-test.js"]');
      script.onload();
      await promise;

      expect(ScriptLoader.isLoaded('reset-test.js')).toBe(true);

      ScriptLoader.reset();

      expect(ScriptLoader.isLoaded('reset-test.js')).toBe(false);
      expect(ScriptLoader._promises.size).toBe(0);
    });
  });
});
