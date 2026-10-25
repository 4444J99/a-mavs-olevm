import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { resolve } from 'node:path';
import { test } from 'vitest';
import semver from 'semver';

test('the advertised Node floor supports the complete locked toolchain', () => {
  const root = fileURLToPath(new NodeURL('../../', import.meta.url));
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'package.json'), 'utf8')
  );
  const lock = JSON.parse(
    readFileSync(resolve(root, 'package-lock.json'), 'utf8')
  );
  const floor = semver.minVersion(manifest.engines.node);
  assert.ok(floor, 'The root runtime range must have a supported minimum');
  const incompatible = Object.entries(lock.packages)
    .filter(([, entry]) => entry.engines?.node)
    .filter(([, entry]) => !semver.satisfies(floor, entry.engines.node))
    .map(([name, entry]) => `${name || 'root'} requires ${entry.engines.node}`);
  assert.deepEqual(incompatible, [], `Unsupported advertised runtime ${floor}`);
  const pinned = readFileSync(resolve(root, '.nvmrc'), 'utf8').trim();
  assert.ok(semver.satisfies(pinned, manifest.engines.node));
});
