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
import { runShipSoonAudit } from '../../scripts/verify-ship-soon.mjs';

const projectRoot = path.resolve(fileURLToPath(new NodeURL('../../', import.meta.url)));

describe('Ship-Soon Pre-Launch Audit (#94)', () => {
  it('runs against repository root and returns ok: true with all 4 checks passed', async () => {
    const result = await runShipSoonAudit(projectRoot);

    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('checks');
    expect(result.checks).toHaveLength(4);

    const checkNames = result.checks.map(c => c.name);
    expect(checkNames).toContain('Required entrypoints');
    expect(checkNames).toContain('Service worker offline cache & range handler readiness');
    expect(checkNames).toContain('Catalogue completeness');
    expect(checkNames).toContain('AI exhibit modules presence & local-first fallback readiness');

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

  it('CLI runner exits with status 0 on projectRoot', () => {
    const scriptPath = path.join(projectRoot, 'scripts/verify-ship-soon.mjs');
    const stdout = execFileSync('node', [scriptPath, projectRoot], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(stdout).toContain('PASSED (Ready for Pre-Launch)');
    expect(stdout).toContain('[Required entrypoints]: All required entrypoints present');
    expect(stdout).toContain('[Catalogue completeness]: Catalogue complete');
  });
});
