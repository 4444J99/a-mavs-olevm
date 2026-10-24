'use strict';

/**
 * @file ScriptLoader.js
 * @description Promise-based script loading utility for dynamic <script> injection.
 * Replaces jQuery.cachedScript with a non-jQuery, idempotent loader that tracks
 * loaded/loading state to prevent duplicate requests.
 */

/**
 * ScriptLoader — static utility for dynamically loading JavaScript files.
 * Tracks loaded and in-flight scripts to prevent duplicate <script> injections.
 */
// eslint-disable-next-line no-unused-vars
class ScriptLoader {
  /** @type {Map<string, Promise<void>>} In-flight or completed load promises keyed by src */
  static _promises = new Map();

  /** @type {Set<string>} Successfully loaded script URLs */
  static _loaded = new Set();

  /**
   * Load a single script by URL.
   * Returns the same promise if the script is already loading/loaded.
   *
   * @param {string} src - Script URL (relative or absolute)
   * @param {Object} [opts] - Options
   * @param {boolean} [opts.async=true] - Set the async attribute
   * @param {string} [opts.crossOrigin] - crossorigin attribute value
   * @param {string} [opts.integrity] - SRI integrity hash
   * @returns {Promise<void>}
   */
  static load(src, opts = {}) {
    if (ScriptLoader._promises.has(src)) {
      return ScriptLoader._promises.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      // Already in DOM (e.g. inline script tag)?
      if (document.querySelector(`script[src="${src}"]`)) {
        ScriptLoader._loaded.add(src);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = opts.async !== false;

      if (opts.crossOrigin) {
        script.crossOrigin = opts.crossOrigin;
      }
      if (opts.integrity) {
        script.integrity = opts.integrity;
      }

      script.onload = () => {
        ScriptLoader._loaded.add(src);
        resolve();
      };

      script.onerror = () => {
        // A failed tag remaining in the DOM must not make a retry look loaded.
        script.remove();
        // Remove failed script from tracking so it can be retried
        ScriptLoader._promises.delete(src);
        reject(new Error(`ScriptLoader: failed to load ${src}`));
      };

      document.head.appendChild(script);
    });

    ScriptLoader._promises.set(src, promise);
    return promise;
  }

  /**
   * Load scripts sequentially, preserving order.
   *
   * @param {Array<string|{src: string, crossOrigin?: string, integrity?: string}>} scripts
   * @returns {Promise<void>}
   */
  static async loadSequence(scripts) {
    for (const entry of scripts) {
      if (typeof entry === 'string') {
        await ScriptLoader.load(entry);
      } else {
        await ScriptLoader.load(entry.src, entry);
      }
    }
  }

  /**
   * Load scripts in parallel (order not guaranteed).
   *
   * @param {Array<string|{src: string, crossOrigin?: string, integrity?: string}>} scripts
   * @returns {Promise<void>}
   */
  static async loadParallel(scripts) {
    await Promise.all(
      scripts.map(entry => {
        if (typeof entry === 'string') {
          return ScriptLoader.load(entry);
        }
        return ScriptLoader.load(entry.src, entry);
      })
    );
  }

  /**
   * Load a script with fallback URLs. Tries each URL in order until one succeeds.
   *
   * @param {Array<string|{src: string, crossOrigin?: string, integrity?: string}>} fallbacks
   * @returns {Promise<void>}
   */
  static async loadWithFallback(fallbacks) {
    for (let i = 0; i < fallbacks.length; i++) {
      try {
        const entry = fallbacks[i];
        if (typeof entry === 'string') {
          await ScriptLoader.load(entry);
        } else {
          await ScriptLoader.load(entry.src, entry);
        }
        return; // success
      } catch (err) {
        if (i === fallbacks.length - 1) {
          throw err; // all fallbacks exhausted
        }
        console.warn(`ScriptLoader fallback: ${err.message}, trying next...`);
      }
    }
  }

  /**
   * Check if a script URL has been successfully loaded.
   * @param {string} src
   * @returns {boolean}
   */
  static isLoaded(src) {
    return ScriptLoader._loaded.has(src);
  }

  /**
   * Reset all tracking state (for testing).
   */
  static reset() {
    ScriptLoader._promises.clear();
    ScriptLoader._loaded.clear();
  }
}
