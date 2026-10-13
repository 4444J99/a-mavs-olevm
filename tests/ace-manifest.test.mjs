import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../scripts/validate-ace-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readManifest = () => JSON.parse(readFileSync(resolve(root, 'ace-manifest.json'), 'utf8'));

test('all functional paths and typed relationships resolve in the real repository', () => {
  const manifest = readManifest();
  const result = validateManifest(manifest, root);
  assert.equal(result.modules, manifest.modules.length);
  assert.ok(result.modules > 0);
});
test('dangling capability and artwork references are rejected', () => {
  const capability = readManifest();
  capability.modules[0].capability_ids.push('missing-capability');
  assert.throws(() => validateManifest(capability, root), /Unknown capability/);
  const composition = readManifest();
  composition.compositions[0].artwork_id = 'missing-artwork';
  assert.throws(() => validateManifest(composition, root), /Unknown artwork/);
});
test('duplicate identities are rejected within an entity type', () => {
  const manifest = readManifest();
  manifest.modules.push({ ...manifest.modules[0] });
  assert.throws(() => validateManifest(manifest, root), /Duplicate modules id/);
});
test('missing and escaping paths are rejected without retrieving external media', () => {
  for (const path of ['../another-repository/private-source.json', '/tmp/private-source.json']) {
    const manifest = readManifest();
    manifest.modules[0].path = path;
    assert.throws(() => validateManifest(manifest, root), /Unsafe modules path/);
  }
  const manifest = readManifest();
  manifest.modules[0].path = 'does-not-exist.js';
  assert.throws(() => validateManifest(manifest, root), /Missing modules path/);
});
test('editions cannot assert a composition that does not exist', () => {
  const manifest = readManifest();
  manifest.editions.push({ id: 'test-edition', composition_id: 'missing-composition' });
  assert.throws(() => validateManifest(manifest, root), /Unknown composition/);
});
