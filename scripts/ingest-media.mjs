/**
 * @file ingest-media.mjs
 * @description Content-ingest pipeline for the static art site.
 *   Processes image and video files from an Apple Photos export (or any folder)
 *   into web-optimised formats and appends entries to data/works.json.
 *
 * ## Apple Photos export recipe
 *
 *   1. Open Photos.app and select the photos/albums you want to publish.
 *   2. For RAW or HEIC originals:
 *        File ▸ Export ▸ Export Unmodified Originals…
 *        Choose a destination folder (e.g. ~/Desktop/export-batch).
 *   3. For JPEG or edited copies:
 *        File ▸ Export ▸ Export N Photos…
 *        Choose Photo Kind = JPEG, Maximum quality, include/exclude metadata
 *        as desired, pick the same destination folder.
 *   4. Run:
 *        node scripts/ingest-media.mjs <destination-folder> --category Photography
 *   5. PRIVACY: ONLY explicitly-exported selections ever enter the public repo.
 *      Never bulk-ingest your Photos library path directly — always export first.
 *
 * ## CLI usage
 *
 * Each batch writes a fresh version directory. Previously published media and
 * interrupted new outputs are retained; the catalog changes only on success.
 *
 *   node scripts/ingest-media.mjs <input-dir> \
 *     --category <Category>  (e.g. Photography | Video | Multimedia | Design | Generative)
 *     [--type photo]         (force type; otherwise inferred from file extension)
 *     [--featured]           (mark all ingested items as featured)
 *     [--dry-run]            (print what would be done without writing any files)
 *
 * ## Example
 *
 *   node scripts/ingest-media.mjs ~/Desktop/export-batch --category Photography --featured
 *   node scripts/ingest-media.mjs ~/Desktop/shoot --category Photography --dry-run
 */

import {
  loadWorks as readWorks,
  saveWorks as writeWorks,
  upsertGenerated,
} from './works-manifest.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { randomUUID, createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Resolve repo root from script location (scripts/ → parent)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const WORKS_JSON = path.join(REPO_ROOT, 'data', 'works.json');
const IMG_BASE = path.join(REPO_ROOT, 'img', 'photos');
const TRANSCODE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'transcode-video.js');

const RESPONSIVE_WIDTHS = [480, 960, 1600]; // px — portrait originals also get original-cap

const IMAGE_EXTS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
]);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string to a URL-safe slug.
 * @param {string} str
 * @returns {string}
 */
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a works entry id from category + filename.
 * @param {string} categorySlug
 * @param {string} filename  (with or without extension)
 * @returns {string}
 */
function makeId(categorySlug, filename) {
  const base = path.basename(filename, path.extname(filename));
  return `${categorySlug}-${outputStem(base)}`;
}

function outputStem(name) {
  return (
    toSlug(name) || createHash('sha256').update(name).digest('hex').slice(0, 16)
  );
}

function relativeUrl(filename) {
  return path.relative(REPO_ROOT, filename).split(path.sep).join('/');
}

/**
 * Load data/works.json, creating a fresh manifest if missing.
 * @returns {{ version: number, works: object[] }}
 */
function loadWorks() {
  return readWorks(WORKS_JSON);
}

/**
 * Save data/works.json with pretty-printing.
 * @param {{ version: number, works: object[] }} manifest
 */
function saveWorks(manifest) {
  writeWorks(WORKS_JSON, manifest);
}

/**
 * Build a blank works entry conforming to the schema.
 * @param {string} id
 * @param {string} src
 * @param {string} type
 * @param {string} category
 * @param {string} title
 * @param {boolean} featured
 * @returns {object}
 */
function blankEntry(id, src, type, category, title, featured) {
  return {
    id,
    src,
    type,
    category,
    title,
    caption: '',
    date: '',
    tags: [],
    poster: null,
    hls: false,
    ig_url: null,
    featured,
    w: null,
    h: null,
    srcset: { avif: [], webp: [] },
  };
}

/**
 * Collect all regular files (non-recursive) from a directory.
 * @param {string} dir
 * @returns {string[]}  absolute paths
 */
function collectFiles(dir) {
  return fs
    .readdirSync(dir)
    .sort()
    .map(f => path.join(dir, f))
    .filter(f => fs.statSync(f).isFile());
}

/**
 * Parse CLI arguments.
 * @returns {{ inputDir: string, category: string, type: string|null, featured: boolean, dryRun: boolean }}
 */
function parseArgs() {
  const raw = process.argv.slice(2);
  const opts = {
    inputDir: null,
    category: null,
    type: null,
    featured: false,
    dryRun: false,
  };

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--category' && raw[i + 1]) {
      opts.category = raw[++i];
    } else if (arg === '--type' && raw[i + 1]) {
      opts.type = raw[++i];
    } else if (arg === '--featured') {
      opts.featured = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (!opts.inputDir) {
      opts.inputDir = arg;
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Image processing via sharp
// ---------------------------------------------------------------------------

/**
 * Dynamically import sharp (devDependency).
 * Returns null if sharp is not installed so callers can fall back gracefully.
 * @returns {Promise<import('sharp')|null>}
 */
async function loadSharp() {
  try {
    const { default: sharp } = await import('sharp');
    return sharp;
  } catch {
    console.warn(
      '[warn] sharp unavailable; copying selected originals without responsive variants'
    );
    return null;
  }
}

/**
 * Process a single image file: produce AVIF + WebP at responsive widths.
 * @param {string} inputPath
 * @param {string} outDir          directory to write optimised images into
 * @param {string} baseName        stem (no extension)
 * @param {import('sharp')} sharp
 * @param {boolean} dryRun
 * @returns {Promise<{ w: number|null, h: number|null, srcset: { avif: string[], webp: string[] }, largestWebp: string|null }>}
 */
async function processImage(inputPath, outDir, baseName, sharp, dryRun) {
  let meta;
  try {
    meta = await sharp(inputPath).metadata();
  } catch (err) {
    throw new Error(`sharp.metadata failed for ${inputPath}: ${err.message}`, {
      cause: err,
    });
  }

  const origW = meta.autoOrient?.width ?? meta.width ?? null;
  const origH = meta.autoOrient?.height ?? meta.height ?? null;

  // Determine which widths to emit (never upscale)
  const widths = RESPONSIVE_WIDTHS.filter(w => origW == null || w <= origW);
  // Always include original-cap (the actual original width) if it is larger than the biggest responsive width
  if (origW != null && origW > Math.max(...RESPONSIVE_WIDTHS)) {
    widths.push(origW);
  }
  // Ensure at least one size
  if (widths.length === 0 && origW != null) widths.push(origW);

  const avifSrcset = [];
  const webpSrcset = [];
  let largestWebp = null;

  if (!dryRun) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  }

  for (const w of widths) {
    const avifName = `${baseName}-${w}w.avif`;
    const webpName = `${baseName}-${w}w.webp`;
    const avifPath = path.join(outDir, avifName);
    const webpPath = path.join(outDir, webpName);

    // Paths relative to repo root for the JSON manifest
    const avifRel = relativeUrl(avifPath);
    const webpRel = relativeUrl(webpPath);

    if (dryRun) {
      console.log(`  [dry-run] would write ${avifRel}`);
      console.log(`  [dry-run] would write ${webpRel}`);
    } else {
      try {
        await sharp(inputPath)
          .autoOrient()
          .resize({ width: w, withoutEnlargement: true })
          .avif({ quality: 75 })
          .toFile(avifPath);
        await sharp(inputPath)
          .autoOrient()
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(webpPath);
      } catch (err) {
        throw new Error(
          `Writing ${w}w variants for ${baseName}: ${err.message}`,
          { cause: err }
        );
      }
    }
    avifSrcset.push(`${avifRel} ${w}w`);
    webpSrcset.push(`${webpRel} ${w}w`);
    largestWebp = webpRel;
  }

  return {
    w: origW,
    h: origH,
    srcset: { avif: avifSrcset, webp: webpSrcset },
    largestWebp,
  };
}

// ---------------------------------------------------------------------------
// Video processing via transcode-video.js + ffmpeg poster
// ---------------------------------------------------------------------------

/**
 * Generate a poster frame for a video using ffmpeg.
 * @param {string} inputPath
 * @param {string} posterPath   absolute destination path
 * @param {boolean} dryRun
 * @returns {string|null}  relative poster path, or null on failure
 */
function generatePoster(inputPath, posterPath, dryRun) {
  const posterRel = relativeUrl(posterPath);
  if (dryRun) {
    console.log(`  [dry-run] would write poster ${posterRel}`);
    return posterRel;
  }

  const dir = path.dirname(posterPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const result = spawnSync(
    FFMPEG,
    [
      '-y',
      '-threads',
      '1',
      '-filter_threads',
      '1',
      '-i',
      inputPath,
      '-ss',
      '0',
      '-frames:v',
      '1',
      posterPath,
    ],
    { stdio: 'pipe', timeout: 120000 }
  );

  if (result.status !== 0) {
    // Try system ffmpeg as fallback
    const fallback = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-i',
        inputPath,
        '-ss',
        '0',
        '-frames:v',
        '1',
        posterPath,
      ],
      { stdio: 'pipe', timeout: 120000 }
    );
    if (fallback.status !== 0) {
      console.error(`[error] ffmpeg poster generation failed for ${inputPath}`);
      throw new Error(`Poster generation failed for ${inputPath}`);
    }
  }
  if (!fs.existsSync(posterPath) || fs.statSync(posterPath).size === 0) {
    throw new Error(`Poster generation produced no image for ${inputPath}`);
  }
  return posterRel;
}

/**
 * Transcode a video via scripts/transcode-video.js (CJS, shells out).
 * @param {string} inputPath
 * @param {string} outDir        absolute path for HLS output
 * @param {boolean} dryRun
 * @returns {{ hlsRel: string|null }}
 */
function transcodeVideo(inputPath, outDir, dryRun) {
  const hlsRel = relativeUrl(path.join(outDir, 'master.m3u8'));
  if (dryRun) {
    console.log(`  [dry-run] would transcode ${inputPath} → ${hlsRel}`);
    return { hlsRel };
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const encodeTimeoutSeconds = Number(
    process.env.ETCETER4_VIDEO_ENCODE_TIMEOUT_SECONDS ?? 600
  );
  if (
    !Number.isInteger(encodeTimeoutSeconds) ||
    encodeTimeoutSeconds < 1 ||
    encodeTimeoutSeconds > 1800
  ) {
    throw new Error(
      'ETCETER4_VIDEO_ENCODE_TIMEOUT_SECONDS must be an integer from 1 to 1800'
    );
  }

  const result = spawnSync(
    process.execPath,
    [
      TRANSCODE_SCRIPT,
      inputPath,
      outDir,
      '--encode-timeout-seconds',
      String(encodeTimeoutSeconds),
    ],
    {
      stdio: 'inherit',
      timeout: (encodeTimeoutSeconds + 60) * 1000,
      env: { ...process.env, PATH: `/opt/homebrew/bin:${process.env.PATH}` },
    }
  );

  if (result.status !== 0 || !fs.existsSync(path.join(outDir, 'master.m3u8'))) {
    throw new Error(`Video transcode failed for ${inputPath}`);
  }

  return { hlsRel };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (!opts.inputDir || !opts.category) {
    console.error(
      'Usage: node scripts/ingest-media.mjs <input-dir> --category <Category> [--type photo] [--featured] [--dry-run]'
    );
    process.exit(1);
  }

  const inputDir = path.resolve(opts.inputDir);
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const categorySlug = toSlug(opts.category);
  if (!categorySlug)
    throw new Error('Category must contain letters or numbers');
  // An interrupted batch must not modify media referenced by the old catalog.
  // Keep earlier versions and partial new versions; publication is a later step.
  const outImgDir = path.join(IMG_BASE, categorySlug, randomUUID());

  // Validate the catalog before producing any files.
  const manifest = loadWorks();
  const sharp = await loadSharp();

  const files = collectFiles(inputDir);
  if (files.length === 0) {
    console.log('No files found in input directory.');
    process.exit(0);
  }

  console.log(`Ingesting ${files.length} file(s) from ${inputDir}`);
  console.log(`Category: ${opts.category} (slug: ${categorySlug})`);
  if (opts.dryRun) console.log('[DRY RUN — no files will be written]');
  console.log('');

  // Load manifest once; we'll upsert into it
  const existingById = new Map(manifest.works.map(w => [w.id, w]));
  const newEntries = [];
  const batchIds = new Set();
  for (const filePath of files) {
    if (
      !IMAGE_EXTS.has(path.extname(filePath).toLowerCase()) &&
      !VIDEO_EXTS.has(path.extname(filePath).toLowerCase())
    )
      continue;
    const id = makeId(categorySlug, path.basename(filePath));
    if (batchIds.has(id))
      throw new Error(`Input files collide on work id: ${id}`);
    batchIds.add(id);
  }

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    const originalStem = path.parse(filePath).name;
    const baseName = outputStem(originalStem);
    const id = makeId(categorySlug, filename);
    const title = originalStem.replace(/[-_]+/g, ' ');

    console.log(`Processing: ${filename} (id: ${id})`);

    if (IMAGE_EXTS.has(ext)) {
      // -----------------------------------------------------------------------
      // Image
      // -----------------------------------------------------------------------
      const forceType = opts.type ?? 'photo';
      const entry = blankEntry(
        id,
        '',
        forceType,
        opts.category,
        title,
        opts.featured
      );

      if (sharp) {
        const { w, h, srcset, largestWebp } = await processImage(
          filePath,
          outImgDir,
          baseName,
          sharp,
          opts.dryRun
        );
        entry.w = w;
        entry.h = h;
        entry.srcset = srcset;
        entry.src =
          largestWebp ?? relativeUrl(path.join(outImgDir, `${baseName}${ext}`));
      } else {
        // Fallback: copy original, no optimised variants
        const destPath = path.join(outImgDir, `${baseName}${ext}`);
        const destRel = relativeUrl(destPath);
        if (!opts.dryRun) {
          if (!fs.existsSync(outImgDir))
            fs.mkdirSync(outImgDir, { recursive: true });
          fs.copyFileSync(filePath, destPath);
        } else {
          console.log(`  [dry-run] would copy ${filename} → ${destRel}`);
        }
        entry.src = destRel;
      }

      newEntries.push(entry);
    } else if (VIDEO_EXTS.has(ext)) {
      // -----------------------------------------------------------------------
      // Video
      // -----------------------------------------------------------------------
      const forceType = opts.type ?? 'video';
      const videoOutDir = path.join(outImgDir, baseName);
      const posterPath = path.join(videoOutDir, 'poster.jpg');

      const entry = blankEntry(
        id,
        '',
        forceType,
        opts.category,
        title,
        opts.featured
      );
      entry.type = forceType;
      entry.hls = true;

      const { hlsRel } = transcodeVideo(filePath, videoOutDir, opts.dryRun);
      entry.src = hlsRel;

      const posterRel = generatePoster(filePath, posterPath, opts.dryRun);
      entry.poster = posterRel;

      newEntries.push(entry);
    } else {
      console.log(`  Skipping unsupported file type: ${ext}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Idempotent upsert into manifest
  // ---------------------------------------------------------------------------
  let added = 0;
  let updated = 0;

  for (const entry of newEntries) {
    if (existingById.has(entry.id)) {
      // Update in place (preserve any hand-edited fields not set here)
      const existing = existingById.get(entry.id);
      upsertGenerated(existing, entry);
      updated++;
    } else {
      existingById.set(entry.id, entry);
      manifest.works.push(entry);
      added++;
    }
  }

  console.log('');
  console.log(`Results: ${added} added, ${updated} updated`);

  if (!opts.dryRun) {
    saveWorks(manifest);
    console.log(`Manifest written → ${WORKS_JSON}`);
  } else {
    console.log('[dry-run] manifest not written');
    console.log('');
    console.log('Preview of entries that would be upserted:');
    console.log(JSON.stringify(newEntries, null, 2));
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
