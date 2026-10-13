import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const collections = ['capabilities', 'modules', 'source_media', 'compositions', 'artworks', 'editions', 'archives'];
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

/** Validate local identity boundaries without fetching media or external relationships. */
export function validateManifest(manifest, root) {
  requireValue(manifest.schema_version === '1.0.0', 'Unsupported schema_version');
  requireValue(manifest.system_id === 'audiovisual-composition-system', 'Unknown system_id');
  requireValue(Number.isSafeInteger(manifest.repository?.github_id) && manifest.repository.github_id > 0,
    'repository.github_id must be a positive GitHub ID');
  for (const key of ['id', 'name', 'responsibility']) {
    requireValue(nonempty(manifest.software?.[key]), `software.${key} is required`);
  }
  const identities = {};
  for (const kind of collections) {
    requireValue(Array.isArray(manifest[kind]), `${kind} must be an array`);
    identities[kind] = new Set();
    for (const record of manifest[kind]) {
      requireValue(record && nonempty(record.id), `${kind} record requires an id`);
      requireValue(!identities[kind].has(record.id), `Duplicate ${kind} id: ${record.id}`);
      identities[kind].add(record.id);
      if (record.path !== undefined) {
        requireValue(nonempty(record.path) && !isAbsolute(record.path) && !record.path.split(/[\\/]/).includes('..'),
          `Unsafe ${kind} path: ${record.path}`);
        const target = resolve(root, record.path);
        requireValue(existsSync(target), `Missing ${kind} path: ${record.path}`);
        const rel = relative(realpathSync(root), realpathSync(target));
        requireValue(!rel.startsWith('..') && !isAbsolute(rel), `Escaping ${kind} path: ${record.path}`);
      }
    }
  }
  for (const capability of manifest.capabilities) {
    requireValue(nonempty(capability.description), `Capability description missing: ${capability.id}`);
  }
  for (const module of manifest.modules) {
    requireValue(nonempty(module.path), `Module path missing: ${module.id}`);
    requireValue(Array.isArray(module.capability_ids) && module.capability_ids.length > 0,
      `Module capability_ids missing: ${module.id}`);
    for (const id of module.capability_ids) {
      requireValue(identities.capabilities.has(id), `Unknown capability: ${id}`);
    }
    requireValue(Array.isArray(module.interfaces) && module.interfaces.length > 0 && module.interfaces.every(nonempty),
      `Module interfaces missing: ${module.id}`);
  }
  for (const composition of manifest.compositions) {
    requireValue(identities.artworks.has(composition.artwork_id), `Unknown artwork: ${composition.artwork_id}`);
  }
  for (const artwork of manifest.artworks) {
    requireValue(nonempty(artwork.title) && nonempty(artwork.publication_status), `Incomplete artwork: ${artwork.id}`);
    requireValue(Array.isArray(artwork.aliases) && artwork.aliases.every(nonempty), `Artwork aliases missing: ${artwork.id}`);
  }
  for (const edition of manifest.editions) {
    requireValue(identities.compositions.has(edition.composition_id), `Unknown composition: ${edition.composition_id}`);
  }
  return Object.fromEntries(collections.map(kind => [kind, manifest[kind].length]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const counts = validateManifest(JSON.parse(readFileSync(resolve(root, 'ace-manifest.json'), 'utf8')), root);
  console.log(JSON.stringify({ status: 'passed', counts }));
}
