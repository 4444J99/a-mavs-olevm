/**
 * @file backfill-thumbs.mjs
 * @description One-shot performance backfill for the #visual-home works grid.
 *
 *   The grid in worksGallery.js renders every work into a 250px, 1:1
 *   `object-fit: cover` box but lazy-loads the *full-resolution* original as
 *   the thumbnail (avg ~1.3 MB). That is the single biggest drag on the
 *   front-door Lighthouse performance score. This script generates one small
 *   WebP thumbnail per work (512px wide — covers the 250px box at 2× retina),
 *   records its path + the original's intrinsic dimensions on each work entry,
 *   and rewrites data/works.json. Originals are never modified and remain the
 *   source for the full-screen lightbox.
 *
 *   Idempotent: skips a thumbnail that already exists and is newer than its
 *   source. Pass --force to regenerate everything, --dry-run to preview.
 *   Regeneration writes a fresh version directory; prior referenced thumbnails
 *   and failed partial generations are retained. The catalog changes only when
 *   every requested conversion succeeds.
 *
 *   Usage:
 *     node scripts/backfill-thumbs.mjs [--force] [--dry-run]
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { loadWorks, saveWorks } from './works-manifest.mjs';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKS_JSON = path.join(REPO_ROOT, 'data', 'works.json');
const THUMB_DIR_REL = path.posix.join('img', 'thumbs');
const THUMB_DIR = path.join(REPO_ROOT, THUMB_DIR_REL);

// 512px covers the 250px grid box at 2× retina without over-sending bytes.
const THUMB_WIDTH = 512;
const THUMB_QUALITY = 80;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

async function loadSharp() {
  try {
    const { default: sharp } = await import('sharp');
    return sharp;
  } catch {
    console.error(
      '[error] sharp is required (devDependency) — run `npm install`'
    );
    process.exit(1);
  }
}

/** Flat, filesystem-safe thumbnail name derived from the (unique) work id. */
function thumbName(id) {
  return `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}.webp`;
}

function isStale(srcAbs, thumbAbs) {
  if (FORCE || !fs.existsSync(thumbAbs)) {
    return true;
  }
  return fs.statSync(srcAbs).mtimeMs > fs.statSync(thumbAbs).mtimeMs;
}

async function main() {
  const sharp = await loadSharp();
  const manifest = loadWorks(WORKS_JSON);
  const works = manifest.works;
  const version = randomUUID();
  const names = new Set();
  for (const work of works) {
    const name = thumbName(work.id);
    if (names.has(name)) throw new Error(`Thumbnail names collide: ${name}`);
    names.add(name);
  }

  if (!DRY_RUN && !fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const work of works) {
    const src = work.type === 'video' ? work.poster : work.src;
    if (!src) {
      continue;
    }
    const srcAbs = path.join(REPO_ROOT, src);
    if (!fs.existsSync(srcAbs)) {
      console.warn(`[warn] missing original, skipping: ${src}`);
      failed++;
      continue;
    }

    const name = thumbName(work.id);
    const previousRel = work.thumb || path.posix.join(THUMB_DIR_REL, name);
    const previousAbs = path.resolve(REPO_ROOT, previousRel);
    if (!previousAbs.startsWith(`${REPO_ROOT}${path.sep}`)) {
      throw new Error(`Thumbnail escapes the repository: ${work.id}`);
    }
    const thumbRel = path.posix.join(THUMB_DIR_REL, version, name);
    const thumbAbs = path.join(REPO_ROOT, thumbRel);

    // Record intrinsic dimensions + thumb path on the entry regardless of
    // whether we re-encode this run, so the manifest is always complete.
    let meta;
    try {
      meta = await sharp(srcAbs).metadata();
    } catch (err) {
      console.warn(`[warn] metadata failed for ${src}: ${err.message}`);
      failed++;
      continue;
    }

    if (!isStale(srcAbs, previousAbs)) {
      work.thumb = previousRel;
      if (work.type !== 'video') {
        work.w = meta.autoOrient?.width ?? meta.width;
        work.h = meta.autoOrient?.height ?? meta.height;
      }
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] would write ${thumbRel}`);
      generated++;
      continue;
    }

    try {
      fs.mkdirSync(path.dirname(thumbAbs), { recursive: true });
      await sharp(srcAbs)
        .autoOrient()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbAbs);
      work.thumb = thumbRel;
      if (work.type !== 'video') {
        work.w = meta.autoOrient?.width ?? meta.width;
        work.h = meta.autoOrient?.height ?? meta.height;
      }
      generated++;
    } catch (err) {
      console.error(`[error] thumb failed for ${src}: ${err.message}`);
      failed++;
    }
  }

  if (failed) throw new Error(`${failed} thumbnail failures; catalog retained`);
  if (!DRY_RUN) saveWorks(WORKS_JSON, manifest);

  console.log(
    `\nthumbs: ${generated} generated, ${skipped} up-to-date, ${failed} failed (of ${works.length} works)`
  );
  console.log(
    DRY_RUN
      ? '(dry-run — nothing written)'
      : `wrote ${path.relative(REPO_ROOT, WORKS_JSON)}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
