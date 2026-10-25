/**
 * @file tests/unit/sw-range-quota.test.js
 * @description Unit tests for Wave 4 Offline Media Range-Request Stress & Quota Eviction Resilience.
 * Tests evaluateRangeSlice (RFC 7233/9110 compliant range handling) and planCacheEviction (LRU + pinned shell protection).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import path from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';

const projectRoot = path.resolve(
  fileURLToPath(new NodeURL('../../', import.meta.url))
);

function loadMediaServiceWorker() {
  const source = readFileSync(
    path.join(projectRoot, 'js/media/cache/MediaServiceWorker.js'),
    'utf8'
  );
  const sandbox = {
    self: {
      location: {
        origin: 'https://etceter4.com',
        pathname: '/js/media/cache/MediaServiceWorker.js',
      },
      addEventListener: vi.fn(),
      clients: { claim: vi.fn() },
      skipWaiting: vi.fn(),
    },
    caches: {
      open: vi.fn(),
      match: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    },
    console: { warn: vi.fn(), error: vi.fn(), log: vi.fn() },
    URL: globalThis.URL,
    module: { exports: {} },
    globalThis: {},
  };
  createContext(sandbox);
  runInContext(source, sandbox);
  return {
    evaluateRangeSlice:
      sandbox.evaluateRangeSlice ||
      sandbox.self?.evaluateRangeSlice ||
      sandbox.module?.exports?.evaluateRangeSlice,
    planCacheEviction:
      sandbox.planCacheEviction ||
      sandbox.self?.planCacheEviction ||
      sandbox.module?.exports?.planCacheEviction,
  };
}

const { evaluateRangeSlice, planCacheEviction } = loadMediaServiceWorker();

describe('Offline Media Range-Request Stress & Quota Eviction Resilience', () => {
  describe('evaluateRangeSlice(totalByteLength, rangeHeader)', () => {
    const totalSize = 10000;

    it('evaluates standard byte range correctly with status 206', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=0-499');
      expect(result).toEqual({
        status: 206,
        start: 0,
        end: 499,
        contentLength: 500,
        contentRange: 'bytes 0-499/10000',
      });
    });

    it('evaluates open-ended range to the end of content', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=2000-');
      expect(result).toEqual({
        status: 206,
        start: 2000,
        end: 9999,
        contentLength: 8000,
        contentRange: 'bytes 2000-9999/10000',
      });
    });

    it('evaluates suffix range from end of content', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=-1000');
      expect(result).toEqual({
        status: 206,
        start: 9000,
        end: 9999,
        contentLength: 1000,
        contentRange: 'bytes 9000-9999/10000',
      });
    });

    it('clamps suffix range larger than total length to entire resource', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=-15000');
      expect(result).toEqual({
        status: 206,
        start: 0,
        end: 9999,
        contentLength: 10000,
        contentRange: 'bytes 0-9999/10000',
      });
    });

    it('clamps raw end exceeding file size to totalByteLength - 1', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=5000-20000');
      expect(result).toEqual({
        status: 206,
        start: 5000,
        end: 9999,
        contentLength: 5000,
        contentRange: 'bytes 5000-9999/10000',
      });
    });

    it('evaluates single-byte range request (bytes=0-0)', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=0-0');
      expect(result).toEqual({
        status: 206,
        start: 0,
        end: 0,
        contentLength: 1,
        contentRange: 'bytes 0-0/10000',
      });
    });

    it('returns 416 Range Not Satisfiable when start >= totalByteLength', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=10000-11000');
      expect(result).toEqual({
        status: 416,
        start: null,
        end: null,
        contentLength: 0,
        contentRange: 'bytes */10000',
      });
    });

    it('returns 416 when start > end', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=500-200');
      expect(result.status).toBe(416);
      expect(result.contentRange).toBe('bytes */10000');
    });

    it('returns 416 when suffix length is zero or negative', () => {
      const result = evaluateRangeSlice(totalSize, 'bytes=-0');
      expect(result.status).toBe(416);
    });

    it('returns 416 without throwing on malformed or empty range headers', () => {
      expect(evaluateRangeSlice(totalSize, 'invalid').status).toBe(416);
      expect(evaluateRangeSlice(totalSize, 'bytes=abc-def').status).toBe(416);
      expect(evaluateRangeSlice(totalSize, 'bytes=-').status).toBe(416);
      expect(evaluateRangeSlice(totalSize, '').status).toBe(416);
      expect(evaluateRangeSlice(totalSize, null).status).toBe(416);
      expect(evaluateRangeSlice(totalSize, undefined).status).toBe(416);
    });

    it('returns 416 without throwing when totalByteLength is 0 or negative', () => {
      expect(evaluateRangeSlice(0, 'bytes=0-100').status).toBe(416);
      expect(evaluateRangeSlice(-50, 'bytes=0-100').status).toBe(416);
      expect(evaluateRangeSlice(NaN, 'bytes=0-100').status).toBe(416);
    });
  });

  describe('planCacheEviction(entries, maxBytes)', () => {
    it('returns no evictions when total size is within maxBytes', () => {
      const entries = [
        { url: '/audio/track1.mp3', size: 1000, lastAccessed: 100 },
        { url: '/audio/track2.mp3', size: 2000, lastAccessed: 200 },
      ];

      const plan = planCacheEviction(entries, 5000);
      expect(plan.evict).toHaveLength(0);
      expect(plan.retain).toHaveLength(2);
      expect(plan.totalBytesBefore).toBe(3000);
      expect(plan.totalBytesAfter).toBe(3000);
      expect(plan.evictedBytes).toBe(0);
    });

    it('evicts oldest entries first according to LRU timestamp', () => {
      const entries = [
        { id: 'recent', url: '/audio/track3.mp3', size: 1000, lastAccessed: 300 },
        { id: 'oldest', url: '/audio/track1.mp3', size: 1000, lastAccessed: 100 },
        { id: 'middle', url: '/audio/track2.mp3', size: 1000, lastAccessed: 200 },
      ];

      // Limit to 2000 bytes (must evict 1000 bytes)
      const plan = planCacheEviction(entries, 2000);
      expect(plan.evict).toHaveLength(1);
      expect(plan.evict[0].id).toBe('oldest');
      expect(plan.retain.map(e => e.id)).toEqual(['middle', 'recent']);
      expect(plan.totalBytesAfter).toBe(2000);
      expect(plan.evictedBytes).toBe(1000);
    });

    it('protects pinned shell assets from eviction regardless of age', () => {
      const entries = [
        {
          id: 'shell-index',
          url: 'https://app.example/index.html',
          size: 500,
          lastAccessed: 10,
          isPinned: true,
        },
        {
          id: 'shell-css',
          url: 'https://app.example/css/styles.css',
          size: 500,
          lastAccessed: 20,
          isShell: true,
        },
        {
          id: 'shell-v5',
          url: 'https://app.example/offline.html',
          size: 500,
          lastAccessed: 30,
          cacheName: 'etceter4-v5',
        },
        {
          id: 'media-old',
          url: 'https://app.example/audio/old.mp3',
          size: 1000,
          lastAccessed: 50,
        },
        {
          id: 'media-new',
          url: 'https://app.example/audio/new.mp3',
          size: 1000,
          lastAccessed: 100,
        },
      ];

      // Total is 3500 bytes. Limit to 2000 bytes.
      const plan = planCacheEviction(entries, 2000);

      // Pinned shell entries must NEVER be evicted
      const evictedIds = plan.evict.map(e => e.id);
      expect(evictedIds).not.toContain('shell-index');
      expect(evictedIds).not.toContain('shell-css');
      expect(evictedIds).not.toContain('shell-v5');

      // Oldest media entry must be evicted first
      expect(evictedIds).toContain('media-old');
      expect(plan.totalBytesAfter).toBeLessThanOrEqual(2500);
    });

    it('complies with exact byte limit across multiple evictions', () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        id: `track-${i}`,
        url: `/audio/track-${i}.mp3`,
        size: 500,
        lastAccessed: 1000 + i,
      }));

      // Total 5000 bytes, limit 1800 bytes
      const plan = planCacheEviction(entries, 1800);
      expect(plan.totalBytesAfter).toBeLessThanOrEqual(1800);
      expect(plan.retain).toHaveLength(3); // 3 * 500 = 1500 <= 1800
      expect(plan.evict).toHaveLength(7); // 7 * 500 = 3500 evicted
      expect(plan.totalBytesBefore).toBe(5000);
      expect(plan.evictedBytes).toBe(3500);
    });

    it('handles empty entries and zero limit gracefully', () => {
      expect(planCacheEviction([], 1000)).toEqual({
        evict: [],
        retain: [],
        totalBytesBefore: 0,
        totalBytesAfter: 0,
        evictedBytes: 0,
      });

      const entries = [{ url: '/audio/track1.mp3', size: 1000, lastAccessed: 100 }];
      const plan = planCacheEviction(entries, 0);
      expect(plan.evict).toHaveLength(1);
      expect(plan.retain).toHaveLength(0);
      expect(plan.totalBytesAfter).toBe(0);
    });
  });
});
