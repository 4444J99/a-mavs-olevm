/**
 * @file tests/unit/ship-soon-audit.test.js
 * @description Unit tests for Issue #94 Ship-Soon Verification Audit (scripts/verify-ship-soon.mjs).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import {
  runShipSoonAudit,
  generateReleaseReadinessSeal,
} from '../../scripts/verify-ship-soon.mjs';

const projectRoot = path.resolve(fileURLToPath(new NodeURL('../../', import.meta.url)));

describe('Ship-Soon Pre-Launch Audit (#94)', () => {
  it('runs against repository root and returns ok: true with all 5 checks passed', async () => {
    const result = await runShipSoonAudit(projectRoot);

    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('checks');
    expect(result.checks).toHaveLength(5);

    const checkNames = result.checks.map(c => c.name);
    expect(checkNames).toContain('Required entrypoints');
    expect(checkNames).toContain('Service worker offline cache & range handler readiness');
    expect(checkNames).toContain('Catalogue completeness');
    expect(checkNames).toContain('AI exhibit modules presence & local-first fallback readiness');
    expect(checkNames).toContain('Range-slice and cache-eviction readiness');

    for (const check of result.checks) {
      expect(check.passed).toBe(true);
      expect(typeof check.detail).toBe('string');
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });

  it('fails Required entrypoints check when critical entrypoint is missing', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ship-soon-test-'));
    try {
      // Only create index.html, omit manifest.json and others
      writeFileSync(path.join(tempDir, 'index.html'), '<html></html>');

      const result = await runShipSoonAudit(tempDir);
      expect(result.ok).toBe(false);

      const entrypointCheck = result.checks.find(c => c.name === 'Required entrypoints');
      expect(entrypointCheck).toBeDefined();
      expect(entrypointCheck.passed).toBe(false);
      expect(entrypointCheck.detail).toContain('Missing or invalid entrypoints');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails Service worker check when sw.js or MediaServiceWorker is absent', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ship-soon-test-'));
    try {
      // Create minimal entrypoints
      writeFileSync(path.join(tempDir, 'index.html'), '<html></html>');
      writeFileSync(path.join(tempDir, 'manifest.json'), '{}');
      mkdirSync(path.join(tempDir, 'js'), { recursive: true });
      writeFileSync(path.join(tempDir, 'js/page.js'), '// page');
      writeFileSync(path.join(tempDir, 'js/config.js'), '// config');
      mkdirSync(path.join(tempDir, 'js/media/audio'), { recursive: true });
      writeFileSync(path.join(tempDir, 'js/media/audio/sound.js'), '// sound');

      const result = await runShipSoonAudit(tempDir);
      expect(result.ok).toBe(false);

      const swCheck = result.checks.find(
        c => c.name === 'Service worker offline cache & range handler readiness'
      );
      expect(swCheck).toBeDefined();
      expect(swCheck.passed).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails Catalogue completeness check when catalogue track count is incomplete', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ship-soon-test-'));
    try {
      mkdirSync(path.join(tempDir, 'js/data'), { recursive: true });
      // Create incomplete catalogue with only 1 album and 1 track
      const fakeCatalogue = `
        globalThis.ETCETER4_SOURCE_CATALOGUE = {
          albums: {
            ogod: { tracks: [{ id: '1' }] }
          },
          diary: { files: [] }
        };
      `;
      writeFileSync(path.join(tempDir, 'js/data/source-catalogue.js'), fakeCatalogue);

      const result = await runShipSoonAudit(tempDir);
      expect(result.ok).toBe(false);

      const catalogueCheck = result.checks.find(c => c.name === 'Catalogue completeness');
      expect(catalogueCheck).toBeDefined();
      expect(catalogueCheck.passed).toBe(false);
      expect(catalogueCheck.detail).toContain('Catalogue incomplete');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails Range-slice and cache-eviction readiness check when helper functions are missing', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ship-soon-test-'));
    try {
      // Create empty MediaServiceWorker.js without required exports
      mkdirSync(path.join(tempDir, 'js/media/cache'), { recursive: true });
      writeFileSync(path.join(tempDir, 'js/media/cache/MediaServiceWorker.js'), '// empty sw');

      const result = await runShipSoonAudit(tempDir);
      expect(result.ok).toBe(false);

      const rangeEvictionCheck = result.checks.find(
        c => c.name === 'Range-slice and cache-eviction readiness'
      );
      expect(rangeEvictionCheck).toBeDefined();
      expect(rangeEvictionCheck.passed).toBe(false);
      expect(rangeEvictionCheck.detail).toContain('missing evaluateRangeSlice or planCacheEviction');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('CLI runner exits with status 0 on projectRoot', () => {
    const scriptPath = path.join(projectRoot, 'scripts/verify-ship-soon.mjs');
    const stdout = execFileSync('node', [scriptPath, projectRoot], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(stdout).toContain('PASSED (Ready for Pre-Launch)');
    expect(stdout).toContain('[Required entrypoints]: All required entrypoints present');
    expect(stdout).toContain('[Catalogue completeness]: Catalogue complete');
    expect(stdout).toContain('[Range-slice and cache-eviction readiness]: evaluateRangeSlice (206/416)');
    expect(stdout).toContain('Release Seal Digest:');
  });

  describe('generateReleaseReadinessSeal', () => {
    it('generates a verified release readiness seal for projectRoot', async () => {
      const seal = await generateReleaseReadinessSeal(projectRoot);

      expect(seal).toHaveProperty('schema', 'etceter4.release-readiness.v1');
      expect(seal).toHaveProperty('ready', true);
      expect(seal).toHaveProperty('checksCount', 5);
      expect(seal).toHaveProperty('passedCount', 5);
      expect(seal).toHaveProperty('catalogueSummary', {
        albums: 4,
        tracks: 57,
        diaryEntries: 123,
        aiExhibits: 4,
      });
      expect(seal).toHaveProperty('sealDigest');
      expect(typeof seal.sealDigest).toBe('string');
      expect(seal.sealDigest).toHaveLength(64);
      expect(seal.sealDigest).toMatch(/^[0-9a-f]{64}$/);

      // Verify determinism across multiple calls
      const seal2 = await generateReleaseReadinessSeal(projectRoot);
      expect(seal2.sealDigest).toBe(seal.sealDigest);
    });

    it('marks ready as false when audit checks fail in an incomplete directory', async () => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'ship-soon-seal-fail-'));
      try {
        const seal = await generateReleaseReadinessSeal(tempDir);
        expect(seal.ready).toBe(false);
        expect(seal.passedCount).toBeLessThan(seal.checksCount);
        expect(seal.sealDigest).toHaveLength(64);
        expect(seal.sealDigest).toMatch(/^[0-9a-f]{64}$/);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
