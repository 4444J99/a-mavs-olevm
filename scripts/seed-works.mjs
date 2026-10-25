#!/usr/bin/env node

/**
 * @file seed-works.mjs
 * @description One-off seeder for the visual-home works manifest.
 *
 * The browser cannot list directories, so the data-driven gallery reads a
 * manifest (`data/works.json`). This script scans the real images already in
 * the repo under `img/photos/<collection>/` and emits that manifest, deriving
 * category/type by collection and pulling any known captions from the legacy
 * `stillsData` map.
 *
 * Idempotent: re-running adds only new identities in stable collection order,
 * retaining curation, post-seed additions and records from missing collections.
 * Distinct files that collide on an identity fail before saving. The ONGOING pipeline
 * (`scripts/ingest-media.mjs`) APPENDS newly-exported work; this only seeds the
 * baseline from what is already committed.
 *
 * Usage:
 *   node scripts/seed-works.mjs            # write data/works.json
 *   node scripts/seed-works.mjs --dry-run  # print summary only
 *
 * Curation is a 1-line edit per entry in data/works.json (category, title,
 * caption, tags, featured, ig_url) — this just establishes the baseline.
 */

import { readdirSync, existsSync } from 'node:fs';
import { loadWorks, saveWorks } from './works-manifest.mjs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS_REL = 'img/photos';
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

// collection → display category + media type + base tags.
// All photographic collections default to Photography; glitchpr0n is the
// generative/glitch set. Re-categorize freely by editing data/works.json.
const COLLECTION_MAP = {
  media: { category: 'Photography', type: 'photo', tags: ['media'] },
  faster: { category: 'Photography', type: 'photo', tags: ['faster'] },
  slip: { category: 'Photography', type: 'photo', tags: ['slip'] },
  live: { category: 'Photography', type: 'photo', tags: ['live'] },
  diary: { category: 'Photography', type: 'photo', tags: ['diary'] },
  glitchpr0n: { category: 'Generative', type: 'generative', tags: ['glitch'] },
};

// Render order: the more composed collections first, documentary diary last.
const ORDER = ['media', 'faster', 'slip', 'live', 'glitchpr0n', 'diary'];

// Known captions, lifted verbatim from the legacy stillsData (js/images.js).
const CAPTIONS = {
  media: {
    1: 'Fires, fury, absolution. Delusion, fantasy, insincerity. Constants follow us. News breaks us.',
    2: 'Culture, rocks, freedom. Eat me, hide me.',
    3: "It's simple, believe us. Believe us. Believe us.",
  },
  live: { 1: 'perception' },
  faster: { 1: 'console, swell. the clean within' },
  slip: { 1: 'darkness' },
};

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const filename = join(ROOT, 'data/works.json');
const manifest = loadWorks(filename);
const works = manifest.works;
const existing = new Set(works.map(work => work.id));
const scannedIds = new Set();
const summary = {};

for (const col of ORDER) {
  const dir = join(ROOT, PHOTOS_REL, col);
  if (!existsSync(dir)) {
    continue;
  }
  const files = readdirSync(dir)
    .filter(f => IMG_EXT.has(extname(f).toLowerCase()))
    .sort(naturalSort);
  const meta = COLLECTION_MAP[col];
  let i = 0;
  for (const file of files) {
    i += 1;
    const stem = file.replace(/\.[^.]+$/, '');
    // Unique within a collection (filenames are unique) — avoids ID collisions
    // between e.g. diary63.jpg and diary63a.jpg.
    const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Human label = the stem with the leading collection name stripped.
    const label =
      stem.replace(new RegExp(`^${col}`, 'i'), '').replace(/^[-_]/, '') ||
      String(i);
    const match = file.match(/(\d+)/);
    const num = match ? parseInt(match[1], 10) : i;
    const caption = (CAPTIONS[col] && CAPTIONS[col][num]) || '';
    const id = `${col}-${slug}`;
    if (scannedIds.has(id))
      throw new Error(`Seed files collide on work id: ${id}`);
    scannedIds.add(id);
    if (existing.has(id)) continue;
    works.push({
      id: `${col}-${slug}`,
      src: `${PHOTOS_REL}/${col}/${file}`,
      type: meta.type,
      category: meta.category,
      title: `${cap(col)} · ${label}`,
      caption,
      date: '',
      tags: [...meta.tags],
      poster: null,
      hls: false,
      ig_url: null,
      featured: false,
      w: null,
      h: null,
      srcset: { avif: [], webp: [] },
    });
  }
  summary[col] = files.length;
}

// Front-door profile (read by js/worksGallery.js). Editable in data/works.json.
// `instagram` is the bare handle; confirm the exact value before launch.
const profile = {
  name: 'ETCETER4',
  statement: 'Photography · Video · Multimedia · Studies',
  instagram: 'etceter4',
};

if (!manifest.profile) manifest.profile = profile;

if (process.argv.includes('--dry-run')) {
  console.log('seed-works (dry run):', summary, `total=${works.length}`);
} else {
  saveWorks(filename, manifest);
  console.log(`Seeded ${works.length} works → data/works.json`, summary);
}
