/** Shared preservation boundary for the visual-home authoring CLIs. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const snapshots = new WeakMap();
export function loadWorks(filename) {
  const bytes = fs.existsSync(filename)
    ? fs.readFileSync(filename, 'utf8')
    : null;
  const manifest =
    bytes === null ? { version: 1, works: [] } : JSON.parse(bytes);
  validateWorks(manifest);
  snapshots.set(manifest, { filename, bytes });
  return manifest;
}

function validateWorks(manifest) {
  if (!manifest || !Array.isArray(manifest.works))
    throw new Error('Invalid works manifest');
  const ids = new Set();
  for (const work of manifest.works) {
    if (
      !work ||
      typeof work.id !== 'string' ||
      !work.id ||
      typeof work.src !== 'string' ||
      !work.src ||
      ids.has(work.id)
    ) {
      throw new Error('Invalid or duplicate work in manifest');
    }
    ids.add(work.id);
  }
}

export function saveWorks(filename, manifest) {
  validateWorks(manifest);
  const snapshot = snapshots.get(manifest);
  if (!snapshot || snapshot.filename !== filename)
    throw new Error('Manifest must be read before writing');
  const current = fs.existsSync(filename)
    ? fs.readFileSync(filename, 'utf8')
    : null;
  if (current !== snapshot.bytes)
    throw new Error(
      'Manifest changed during processing; retaining the current catalog'
    );
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  fs.writeFileSync(temporary, bytes, { flag: 'wx' });
  fs.renameSync(temporary, filename);
  snapshots.set(manifest, { filename, bytes });
}

/** Reprocessing replaces generated media fields, never the artist's curation. */
export function upsertGenerated(existing, generated) {
  const existingKind = existing.type === 'video' ? 'video' : 'photo';
  const generatedKind = generated.type === 'video' ? 'video' : 'photo';
  if (existingKind !== generatedKind) {
    throw new Error(`Incompatible media kind for existing work ${existing.id}`);
  }
  const oldSource = existing.type === 'video' ? existing.poster : existing.src;
  const newSource =
    generated.type === 'video' ? generated.poster : generated.src;
  // img/thumbs is owned by backfill-thumbs. Preserve manually curated cover
  // pointers elsewhere; invalidate generated pointers without removing files.
  if (oldSource !== newSource && existing.thumb?.startsWith('img/thumbs/')) {
    delete existing.thumb;
  }
  const mediaFields = ['src', 'srcset', 'w', 'h', 'hls', 'poster'];
  for (const key of mediaFields) {
    if (Object.hasOwn(generated, key)) existing[key] = generated[key];
  }
  return existing;
}
