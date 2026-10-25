import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { resolve } from 'node:path';
import { test } from 'vitest';
import semver from 'semver';

// Node 24 no longer ships prebuilt Windows x86 or Linux armv7 runtimes:
// https://nodejs.org/en/blog/migrations/v22-to-v24#platform-support
// Optional binaries for older runtimes remain locked, but cannot be installed
// by those nonexistent Node 24 distributions. Every other engine stays checked.
const unavailableNode24Targets = new Set(['win32/ia32', 'linux/arm']);
function unavailableOptionalTarget(entry) {
  return (
    entry.optional &&
    entry.os?.length &&
    entry.cpu?.length &&
    entry.os.every(os =>
      entry.cpu.every(cpu => unavailableNode24Targets.has(`${os}/${cpu}`))
    )
  );
}

test('the advertised Node floor supports the complete locked toolchain on Node 24 targets', () => {
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
    .filter(([, entry]) => !unavailableOptionalTarget(entry))
    .filter(([, entry]) => !semver.satisfies(floor, entry.engines.node))
    .map(([name, entry]) => `${name || 'root'} requires ${entry.engines.node}`);
  assert.deepEqual(incompatible, [], `Unsupported advertised runtime ${floor}`);
  const pinned = readFileSync(resolve(root, '.nvmrc'), 'utf8').trim();
  assert.ok(semver.satisfies(pinned, manifest.engines.node));
  // Preserve the entire cross-platform optional graph, including unavailable
  // upstream targets. A compatibility fix must never prune their lock entries.
  for (const name of Object.keys(
    lock.packages['node_modules/sharp'].optionalDependencies
  )) {
    assert.ok(
      lock.packages[`node_modules/${name}`],
      `Missing optional capability ${name}`
    );
  }
});

test('only optional artifacts exclusively targeting unavailable upstream distributions qualify', () => {
  assert.ok(
    unavailableOptionalTarget({ optional: true, os: ['win32'], cpu: ['ia32'] })
  );
  for (const entry of [
    { optional: false, os: ['win32'], cpu: ['ia32'] },
    { optional: true, os: ['win32'], cpu: ['x64'] },
    { optional: true, os: ['darwin'], cpu: ['arm64'] },
    { optional: true, os: ['win32'], cpu: ['ia32', 'x64'] },
    { optional: true },
  ])
    assert.ok(!unavailableOptionalTarget(entry));
});
