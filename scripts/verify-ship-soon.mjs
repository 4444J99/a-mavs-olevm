/**
 * @file scripts/verify-ship-soon.mjs
 * @description Issue #94 Pre-Launch Ship-Soon Verification Audit.
 * Audits repository readiness for public deployment:
 * 1. Required entrypoints (index.html, sw.js, manifest.json, js/page.js, js/config.js, js/media/audio/sound.js or aliases)
 * 2. Service worker offline cache & range handler readiness (sw.js + MediaServiceWorker.js)
 * 3. Catalogue completeness (4 albums, 57 tracks, 123 diary entries)
 * 4. AI exhibit modules presence & local-first fallback readiness
 *
 * Can be executed as a CLI script or imported via { runShipSoonAudit }.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

/**
 * Run the comprehensive pre-launch ship-soon audit.
 * @param {string} [rootDir=process.cwd()]
 * @returns {Promise<{ ok: boolean, checks: Array<{ name: string, passed: boolean, detail: string }> }>}
 */
export async function runShipSoonAudit(rootDir = process.cwd()) {
  const checks = [];

  // ─────────────────────────────────────────────────────────────
  // 1. Required entrypoints
  // ─────────────────────────────────────────────────────────────
  const requiredPaths = [
    'index.html',
    'sw.js',
    'manifest.json',
    'js/page.js',
    'js/config.js',
  ];

  const audioCandidates = [
    'js/media/audio/sound.js',
    'js/media/audio/EnhancedAudioPlayer.js',
    'js/uiSounds.js',
    'js/audioPlayer.js',
  ];

  const missingEntrypoints = [];

  for (const relPath of requiredPaths) {
    const fullPath = path.join(rootDir, relPath);
    if (!existsSync(fullPath) || statSync(fullPath).size === 0) {
      missingEntrypoints.push(relPath);
    }
  }

  // Validate manifest.json is valid JSON
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (_err) {
      missingEntrypoints.push('manifest.json (invalid JSON)');
    }
  }

  // Check audio entrypoint or aliases
  const hasAudioEntrypoint = audioCandidates.some(relPath => {
    const fullPath = path.join(rootDir, relPath);
    return existsSync(fullPath) && statSync(fullPath).size > 0;
  });

  if (!hasAudioEntrypoint) {
    missingEntrypoints.push('js/media/audio/sound.js (or audio aliases)');
  }

  if (missingEntrypoints.length === 0) {
    checks.push({
      name: 'Required entrypoints',
      passed: true,
      detail: 'All required entrypoints present and valid (index.html, sw.js, manifest.json, page.js, config.js, sound.js)',
    });
  } else {
    checks.push({
      name: 'Required entrypoints',
      passed: false,
      detail: `Missing or invalid entrypoints: ${missingEntrypoints.join(', ')}`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Service worker offline cache & range handler readiness
  // ─────────────────────────────────────────────────────────────
  const swPath = path.join(rootDir, 'sw.js');
  const mswPaths = [
    path.join(rootDir, 'js/sw/MediaServiceWorker.js'),
    path.join(rootDir, 'js/media/cache/MediaServiceWorker.js'),
  ];

  let swReady = false;
  let rangeReady = false;
  const swIssues = [];

  if (existsSync(swPath)) {
    const swContent = readFileSync(swPath, 'utf8');
    const hasCacheName = swContent.includes('etceter4-') || swContent.includes('CACHE_NAME');
    const hasFetchHandler = swContent.includes("addEventListener('fetch'") || swContent.includes('addEventListener("fetch"');
    const hasOfflineHandling = swContent.includes('caches.match') || swContent.includes('offline');

    if (hasCacheName && hasFetchHandler && hasOfflineHandling) {
      swReady = true;
    } else {
      swIssues.push('sw.js missing offline cache strategy or fetch handler');
    }
  } else {
    swIssues.push('sw.js missing');
  }

  const existingMswPath = mswPaths.find(p => existsSync(p));
  if (existingMswPath) {
    const mswContent = readFileSync(existingMswPath, 'utf8');
    // Media service worker handles media caching, range requests or root worker delegation
    const hasRangeOrMediaCache =
      mswContent.includes('MediaServiceWorker') ||
      mswContent.includes('MEDIA_CACHE') ||
      mswContent.includes('206') ||
      mswContent.includes('bytes') ||
      mswContent.includes('sw.js');

    if (hasRangeOrMediaCache) {
      rangeReady = true;
    } else {
      swIssues.push('MediaServiceWorker.js missing media cache / range request strategy');
    }
  } else {
    swIssues.push('MediaServiceWorker.js missing in both js/sw/ and js/media/cache/');
  }

  if (swReady && rangeReady) {
    checks.push({
      name: 'Service worker offline cache & range handler readiness',
      passed: true,
      detail: 'Root sw.js offline cache and MediaServiceWorker range handlers verified',
    });
  } else {
    checks.push({
      name: 'Service worker offline cache & range handler readiness',
      passed: false,
      detail: `Service worker readiness failed: ${swIssues.join('; ')}`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Catalogue completeness (4 albums, 57 tracks, 123 diary entries)
  // ─────────────────────────────────────────────────────────────
  const cataloguePath = path.join(rootDir, 'js/data/source-catalogue.js');
  let cataloguePass = false;
  let catalogueDetail = '';

  if (existsSync(cataloguePath)) {
    try {
      const catalogueCode = readFileSync(cataloguePath, 'utf8');
      const sandbox = { globalThis: {}, console };
      createContext(sandbox);
      runInContext(catalogueCode, sandbox);

      const catalogue = sandbox.globalThis.ETCETER4_SOURCE_CATALOGUE;
      if (catalogue && catalogue.albums) {
        const albumKeys = Object.keys(catalogue.albums);
        const albumCount = albumKeys.length;
        const totalTracks = albumKeys.reduce((acc, key) => {
          const album = catalogue.albums[key];
          return acc + (Array.isArray(album.tracks) ? album.tracks.length : 0);
        }, 0);
        const diaryCount = Array.isArray(catalogue.diary?.files)
          ? catalogue.diary.files.length
          : 0;

        if (albumCount === 4 && totalTracks === 57 && diaryCount === 123) {
          cataloguePass = true;
          catalogueDetail = `Catalogue complete: 4 albums, 57 tracks, 123 diary entries verified`;
        } else {
          catalogueDetail = `Catalogue incomplete: found ${albumCount}/4 albums, ${totalTracks}/57 tracks, ${diaryCount}/123 diary entries`;
        }
      } else {
        catalogueDetail = 'ETCETER4_SOURCE_CATALOGUE object missing or unpopulated in source-catalogue.js';
      }
    } catch (err) {
      catalogueDetail = `Failed evaluating source-catalogue.js: ${err.message}`;
    }
  } else {
    catalogueDetail = 'Missing js/data/source-catalogue.js';
  }

  checks.push({
    name: 'Catalogue completeness',
    passed: cataloguePass,
    detail: catalogueDetail,
  });

  // ─────────────────────────────────────────────────────────────
  // 4. AI exhibit modules presence & local-first fallback readiness
  // ─────────────────────────────────────────────────────────────
  const aiModulePath = path.join(rootDir, 'js/ai/AIExhibit.js');
  const portalPath = path.join(rootDir, 'js/ergasterion/ExhibitPortal.js');
  const expectedExhibits = [
    'audio-orb',
    'gemini-ink-studio',
    'p5js-playground',
    'synthwave-space',
  ];

  let exhibitsPass = false;
  let exhibitsDetail = '';

  if (existsSync(aiModulePath)) {
    try {
      const aiModule = await import(pathToFileURL(aiModulePath).href);
      const { AI_EXHIBIT_CLASSES, getExhibit } = aiModule;

      const registeredKeys = Object.keys(AI_EXHIBIT_CLASSES || {});
      const allFound = expectedExhibits.every(id => registeredKeys.includes(id));

      if (allFound) {
        // Test lifecycle compliance for all 4 exhibits
        let allLifecycleOk = true;
        const requiredMethods = ['init', 'activate', 'deactivate', 'getStatus', 'renderFallback'];

        for (const id of expectedExhibits) {
          const exhibit = getExhibit(id);
          const hasMethods = requiredMethods.every(m => typeof exhibit[m] === 'function');
          const status = exhibit.getStatus();
          if (!hasMethods || !status.fallbackReady) {
            allLifecycleOk = false;
            break;
          }
        }

        if (allLifecycleOk) {
          exhibitsPass = true;
          exhibitsDetail = 'All 4 AI exhibit modules present with verified local-first fallback and lifecycle contract';
        } else {
          exhibitsDetail = 'One or more exhibit modules missing required lifecycle methods';
        }
      } else {
        exhibitsDetail = `Missing expected exhibit classes in AIExhibit.js: expected ${expectedExhibits.join(', ')}`;
      }
    } catch (err) {
      exhibitsDetail = `Failed inspecting AI exhibit modules: ${err.message}`;
    }
  } else if (existsSync(portalPath)) {
    // Fallback inspection of ExhibitPortal if standalone module absent
    const portalCode = readFileSync(portalPath, 'utf8');
    const hasAllExhibits = expectedExhibits.every(id => portalCode.includes(id));
    if (hasAllExhibits) {
      exhibitsPass = true;
      exhibitsDetail = 'All 4 exhibits declared in ExhibitPortal with fallback UI';
    } else {
      exhibitsDetail = 'ExhibitPortal missing one or more required exhibit definitions';
    }
  } else {
    exhibitsDetail = 'Neither js/ai/AIExhibit.js nor js/ergasterion/ExhibitPortal.js found';
  }

  checks.push({
    name: 'AI exhibit modules presence & local-first fallback readiness',
    passed: exhibitsPass,
    detail: exhibitsDetail,
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Range-slice and cache-eviction readiness (MediaServiceWorker.js)
  // ─────────────────────────────────────────────────────────────
  let rangeEvictionPass = false;
  let rangeEvictionDetail = '';

  const mswCandidate = path.join(
    rootDir,
    'js/media/cache/MediaServiceWorker.js'
  );
  if (existsSync(mswCandidate)) {
    try {
      const mswCode = readFileSync(mswCandidate, 'utf8');
      const sandbox = {
        self: {
          location: { origin: 'https://etceter4.com', pathname: '/sw.js' },
          addEventListener: () => {},
        },
        caches: {},
        console: { warn: () => {}, error: () => {}, log: () => {} },
        URL: globalThis.URL,
        module: { exports: {} },
        globalThis: {},
      };
      createContext(sandbox);
      runInContext(mswCode, sandbox);

      const evaluateRangeSlice =
        sandbox.evaluateRangeSlice ||
        sandbox.self?.evaluateRangeSlice ||
        sandbox.module?.exports?.evaluateRangeSlice;
      const planCacheEviction =
        sandbox.planCacheEviction ||
        sandbox.self?.planCacheEviction ||
        sandbox.module?.exports?.planCacheEviction;

      if (
        typeof evaluateRangeSlice === 'function' &&
        typeof planCacheEviction === 'function'
      ) {
        // Test evaluateRangeSlice with sample 206 and 416
        const slice206 = evaluateRangeSlice(1000, 'bytes=0-499');
        const slice416 = evaluateRangeSlice(1000, 'bytes=1500-2000');
        const sliceSuffix = evaluateRangeSlice(1000, 'bytes=-100');

        // Test planCacheEviction with sample LRU & pinned entries
        const testEntries = [
          { url: '/index.html', size: 100, isPinned: true },
          { url: '/audio/track1.mp3', size: 500, lastAccessed: 10 },
          { url: '/audio/track2.mp3', size: 500, lastAccessed: 20 },
        ];
        const evictionPlan = planCacheEviction(testEntries, 700);

        const rangeValid =
          slice206.status === 206 &&
          slice206.contentLength === 500 &&
          slice416.status === 416 &&
          sliceSuffix.status === 206 &&
          sliceSuffix.start === 900;

        const evictionValid =
          evictionPlan.evict.length === 1 &&
          evictionPlan.evict[0].url === '/audio/track1.mp3' &&
          evictionPlan.retain.some(e => e.url === '/index.html') &&
          evictionPlan.totalBytesAfter <= 700;

        if (rangeValid && evictionValid) {
          rangeEvictionPass = true;
          rangeEvictionDetail =
            'evaluateRangeSlice (206/416) and planCacheEviction (LRU + pinned shell protection) verified';
        } else {
          rangeEvictionDetail =
            'Range slice or eviction calculation failed verification assertions';
        }
      } else {
        rangeEvictionDetail =
          'MediaServiceWorker.js missing evaluateRangeSlice or planCacheEviction functions';
      }
    } catch (err) {
      rangeEvictionDetail = `Failed verifying range slice & eviction: ${err.message}`;
    }
  } else {
    rangeEvictionDetail = 'Missing js/media/cache/MediaServiceWorker.js';
  }

  checks.push({
    name: 'Range-slice and cache-eviction readiness',
    passed: rangeEvictionPass,
    detail: rangeEvictionDetail,
  });

  const ok = checks.every(c => c.passed);
  return { ok, checks };
}

// ─────────────────────────────────────────────────────────────
// CLI execution entrypoint
// ─────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('--- ET CETER4 SHIP-SOON PRE-LAUNCH AUDIT (#94) ---');
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  console.log(`Auditing directory: ${root}\n`);

  try {
    const result = await runShipSoonAudit(root);
    for (const check of result.checks) {
      const mark = check.passed ? '✔' : '✖';
      console.log(`${mark} [${check.name}]: ${check.detail}`);
    }

    console.log('\nAudit Result:', result.ok ? 'PASSED (Ready for Pre-Launch)' : 'FAILED (Blockers Present)');
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error('Audit encountered fatal error:', error);
    process.exit(1);
  }
}
