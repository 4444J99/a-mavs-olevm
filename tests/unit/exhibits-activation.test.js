/**
 * @file tests/unit/exhibits-activation.test.js
 * @description Unit tests for Issue #144:
 * Activate and test the 4 existing AI exhibits (audio-orb, gemini-ink-studio,
 * p5js-playground, synthwave-space) with deterministic local-first activation,
 * lifecycle contract compliance, and safe fallback when offline/unauthenticated.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AIExhibit,
  AudioOrbExhibit,
  GeminiInkStudioExhibit,
  P5jsPlaygroundExhibit,
  SynthwaveSpaceExhibit,
  AI_EXHIBIT_CLASSES,
  getExhibit,
  getAllExhibits,
  initAllExhibits,
} from '../../js/ai/AIExhibit.js';

describe('AI Exhibits Activation & Lifecycle (Issue #144)', () => {
  let container;
  const originalEnv = { ...process.env };
  const exhibitIds = [
    'audio-orb',
    'gemini-ink-studio',
    'p5js-playground',
    'synthwave-space',
  ];

  beforeEach(() => {
    // Stub canvas getContext for jsdom
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    });

    // Ensure clean DOM container
    container = document.createElement('div');
    container.id = 'test-exhibit-container';
    document.body.appendChild(container);

    // Ensure unauthenticated state
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;
    if (typeof window !== 'undefined') {
      window.ETCETER4_CONFIG = window.ETCETER4_CONFIG || {};
      window.ETCETER4_CONFIG.ai = {};
    }
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.remove();
    }
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Registry and Exports', () => {
    it('defines exactly the 4 required exhibits in the class registry', () => {
      expect(Object.keys(AI_EXHIBIT_CLASSES).sort()).toEqual(
        exhibitIds.slice().sort()
      );
    });

    it('instantiates all 4 exhibits with getExhibit factory', () => {
      for (const id of exhibitIds) {
        const exhibit = getExhibit(id);
        expect(exhibit).toBeInstanceOf(AIExhibit);
        expect(exhibit.id).toBe(id);
      }
    });

    it('returns null for unknown exhibit IDs', () => {
      expect(getExhibit('unknown-exhibit-id')).toBeNull();
    });

    it('retrieves all four exhibits via getAllExhibits()', () => {
      const all = getAllExhibits();
      expect(all).toHaveLength(4);
      const ids = all.map(e => e.id);
      expect(ids).toContain('audio-orb');
      expect(ids).toContain('gemini-ink-studio');
      expect(ids).toContain('p5js-playground');
      expect(ids).toContain('synthwave-space');
    });

    it('initializes all four exhibits concurrently via initAllExhibits()', async () => {
      const exhibits = await initAllExhibits();
      expect(exhibits).toHaveLength(4);
      for (const ex of exhibits) {
        expect(ex.status).toBe('ready');
      }
    });
  });

  describe('Lifecycle Contract Compliance', () => {
    it.each(exhibitIds)(
      '%s implements all required lifecycle methods without unhandled errors',
      async id => {
        const exhibit = getExhibit(id);
        expect(typeof exhibit.init).toBe('function');
        expect(typeof exhibit.activate).toBe('function');
        expect(typeof exhibit.deactivate).toBe('function');
        expect(typeof exhibit.getStatus).toBe('function');
        expect(typeof exhibit.renderFallback).toBe('function');

        // Status before init
        expect(exhibit.status).toBe('uninitialized');

        // 1. init
        await exhibit.init();
        expect(exhibit.status).toBe('ready');

        const initialStatus = exhibit.getStatus();
        expect(initialStatus.status).toBe('ready');
        expect(initialStatus.hasCredentials).toBe(false);
        expect(initialStatus.isLocalFirst).toBe(true);

        // 2. activate in unauthenticated mode
        const activationResult = await exhibit.activate(container);
        expect(activationResult.ok).toBe(true);
        expect(activationResult.mode).toBe('fallback');
        expect(exhibit.status).toBe('fallback');

        // Verify fallback DOM rendered
        const fallbackRegion = container.querySelector(
          `[aria-label="${exhibit.title} Local Fallback"]`
        );
        expect(fallbackRegion).not.toBeNull();
        expect(fallbackRegion.textContent).toContain(exhibit.title);

        // 3. getStatus while active in fallback
        const activeStatus = exhibit.getStatus();
        expect(activeStatus.status).toBe('fallback');
        expect(activeStatus.hasFallbackMounted).toBe(true);

        // 4. deactivate
        const deactResult = await exhibit.deactivate();
        expect(deactResult.ok).toBe(true);
        expect(exhibit.status).toBe('inactive');
        expect(container.children.length).toBe(0);
      }
    );
  });

  describe('Deterministic Local-First Fallback UI and Simulation', () => {
    it('AudioOrbExhibit renders 32-bin spectrum fallback simulation', async () => {
      const exhibit = new AudioOrbExhibit();
      await exhibit.init();
      await exhibit.activate(container);

      expect(exhibit.status).toBe('fallback');
      const fftBars = container.querySelectorAll('.fft-bar');
      expect(fftBars.length).toBe(32);
      expect(container.textContent).toContain('Simulated 32-Bin Audio Spectrum');
    });

    it('GeminiInkStudioExhibit renders LBM fluid canvas and pigment droplets', async () => {
      const exhibit = new GeminiInkStudioExhibit();
      await exhibit.init();
      await exhibit.activate(container);

      expect(exhibit.status).toBe('fallback');
      const canvas = container.querySelector('canvas.ink-preview-canvas');
      expect(canvas).not.toBeNull();
      expect(container.textContent).toContain('Local LBM Fluid Canvas');
    });

    it('P5jsPlaygroundExhibit renders offline sketch code preset', async () => {
      const exhibit = new P5jsPlaygroundExhibit();
      await exhibit.init();
      await exhibit.activate(container);

      expect(exhibit.status).toBe('fallback');
      const code = container.querySelector('pre code');
      expect(code).not.toBeNull();
      expect(code.textContent).toContain('createCanvas');
    });

    it('SynthwaveSpaceExhibit renders bundled offline game showcase references', async () => {
      const exhibit = new SynthwaveSpaceExhibit();
      await exhibit.init();
      await exhibit.activate(container);

      expect(exhibit.status).toBe('fallback');
      expect(container.textContent).toContain('Bundled Offline Game Showcase');
      expect(container.textContent).toContain('gemini2p5.html');
      expect(container.textContent).toContain('gemini3.html');
    });
  });

  describe('Offline and Network Resilience', () => {
    it('activates safely without throwing when navigator.onLine is false', async () => {
      const exhibit = getExhibit('audio-orb');
      vi.spyOn(exhibit, 'isOnline').mockReturnValue(false);

      await exhibit.init();
      const result = await exhibit.activate(container);

      expect(result.ok).toBe(true);
      expect(result.mode).toBe('fallback');
      expect(container.textContent).toContain('offline local-first mode');
    });

    it('survives broken fetch or network errors during activation', async () => {
      const exhibit = getExhibit('p5js-playground');
      // Mock global fetch to reject
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        await exhibit.init();
        const result = await exhibit.activate(container);
        expect(result.ok).toBe(true);
        expect(result.status).toBe('fallback');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('supports rapid multiple activate and deactivate cycles cleanly', async () => {
      const exhibit = getExhibit('gemini-ink-studio');
      await exhibit.init();

      for (let i = 0; i < 3; i++) {
        await exhibit.activate(container);
        expect(exhibit.status).toBe('fallback');
        expect(container.querySelectorAll('.exhibit-fallback').length).toBe(1);

        await exhibit.deactivate();
        expect(exhibit.status).toBe('inactive');
        expect(container.children.length).toBe(0);
      }
    });
  });
});
