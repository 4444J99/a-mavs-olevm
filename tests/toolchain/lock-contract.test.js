import assert from 'node:assert/strict';
import { test } from 'vitest';
import { validatePackageLock } from '../../scripts/validate-package-lock.js';

function fixture() {
  const manifest = {
    name: 'fixture',
    version: '1.0.0',
    devDependencies: { tool: '^1.0.0' },
  };
  const entry = version => ({
    version,
    resolved: `https://registry.npmjs.org/pkg/-/pkg-${version}.tgz`,
    integrity: 'sha512-YWJjZA==',
  });
  const lock = {
    name: manifest.name,
    version: manifest.version,
    lockfileVersion: 3,
    packages: {
      '': structuredClone(manifest),
      'node_modules/tool': entry('1.1.0'),
    },
  };
  return { manifest, lock, entry };
}

test('valid complete registry lock passes without mutating inputs', () => {
  const { manifest, lock } = fixture();
  const before = JSON.stringify({ manifest, lock });
  assert.deepEqual(validatePackageLock(manifest, lock), []);
  assert.equal(JSON.stringify({ manifest, lock }), before);
});

test('a changed root range fails even if dependency names are unchanged', () => {
  const { manifest, lock } = fixture();
  manifest.devDependencies.tool = '^2.0.0';
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /devDependencies.tool differs/
  );
});

test('a same-prefix package is not a dependency resolution', () => {
  const { manifest, lock } = fixture();
  lock.packages['node_modules/tool-other'] = lock.packages['node_modules/tool'];
  delete lock.packages['node_modules/tool'];
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /unresolved dependency tool/
  );
});

test('incompatible installed versions fail despite a present dependency name', () => {
  const { manifest, lock } = fixture();
  lock.packages['node_modules/tool'].version = '2.0.0';
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /does not satisfy/
  );
});

test('a transitive dependency in an unrelated package cannot satisfy an import', () => {
  const { manifest, lock, entry } = fixture();
  lock.packages['node_modules/tool'].dependencies = { child: '^1.0.0' };
  lock.packages['node_modules/other/node_modules/child'] = entry('1.2.0');
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /unresolved dependency child/
  );
});

test('nearest nested dependency wins over an incompatible hoisted version', () => {
  const { manifest, lock, entry } = fixture();
  lock.packages['node_modules/tool'].dependencies = { child: '^1.0.0' };
  lock.packages['node_modules/tool/node_modules/child'] = entry('1.2.0');
  lock.packages['node_modules/child'] = entry('2.0.0');
  assert.deepEqual(validatePackageLock(manifest, lock), []);
});

test('missing integrity and missing lock roots are failures, not warnings or crashes', () => {
  const { manifest, lock } = fixture();
  delete lock.packages['node_modules/tool'].integrity;
  assert.match(validatePackageLock(manifest, lock).join('\n'), /integrity/);
  delete lock.packages;
  assert.deepEqual(validatePackageLock(manifest, lock), [
    'The lock root package is missing',
  ]);
});

test('absent platform-optional dependencies are permitted but present ones must satisfy their range', () => {
  const { manifest, lock, entry } = fixture();
  lock.packages['node_modules/tool'].optionalDependencies = {
    platform: '^1.0.0',
  };
  assert.deepEqual(validatePackageLock(manifest, lock), []);
  lock.packages['node_modules/platform'] = entry('2.0.0');
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /does not satisfy/
  );
});

test('an explicit parent-scoped override permits its checked compatibility version only', () => {
  const { manifest, lock, entry } = fixture();
  manifest.overrides = { tool: { child: '2.0.0' } };
  lock.packages['node_modules/tool'].dependencies = { child: '^1.0.0' };
  lock.packages['node_modules/child'] = entry('2.0.0');
  assert.deepEqual(validatePackageLock(manifest, lock), []);
  lock.packages['node_modules/tool'].dependencies.child = '^1.1.0';
  lock.packages['node_modules/unrelated'] = {
    ...entry('1.0.0'),
    dependencies: { child: '^1.0.0' },
  };
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /unrelated: child@2.0.0 does not satisfy/
  );
  lock.packages['node_modules/child'].version = '2.1.0';
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /tool: child@2.1.0 does not satisfy 2.0.0/
  );
});

test('prototype property names are not implicitly optional dependencies', () => {
  const { manifest, lock } = fixture();
  lock.packages['node_modules/tool'].dependencies = { constructor: '^1.0.0' };
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /unresolved dependency constructor/
  );
});

test('malformed package records return errors instead of throwing', () => {
  for (const value of [null, false, 42, 'package', []]) {
    const { manifest, lock } = fixture();
    lock.packages['node_modules/tool'] = value;
    assert.match(
      validatePackageLock(manifest, lock).join('\n'),
      /invalid package entry/
    );
    lock.packages[''] = value;
    assert.match(
      validatePackageLock(manifest, lock).join('\n'),
      /root package.*malformed/
    );
  }
});

test('required peers resolve from the host and reject absence or incompatible versions', () => {
  const { manifest, lock, entry } = fixture();
  lock.packages['node_modules/tool'].peerDependencies = { host: '^2.0.0' };
  lock.packages['node_modules/tool/node_modules/host'] = entry('2.1.0');
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /unresolved peer dependency host/
  );
  lock.packages['node_modules/host'] = entry('1.0.0');
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /peer host@1.0.0 does not satisfy/
  );
  lock.packages['node_modules/host'] = entry('2.1.0');
  assert.deepEqual(validatePackageLock(manifest, lock), []);
});

test('optional peers may be absent but must satisfy their range when installed', () => {
  const { manifest, lock, entry } = fixture();
  lock.packages['node_modules/tool'].peerDependencies = {
    optionalHost: '^2.0.0',
  };
  lock.packages['node_modules/tool'].peerDependenciesMeta = {
    optionalHost: { optional: true },
  };
  assert.deepEqual(validatePackageLock(manifest, lock), []);
  lock.packages['node_modules/optionalHost'] = entry('1.0.0');
  assert.match(
    validatePackageLock(manifest, lock).join('\n'),
    /peer optionalHost@1.0.0 does not satisfy/
  );
  lock.packages['node_modules/optionalHost'] = entry('2.1.0');
  assert.deepEqual(validatePackageLock(manifest, lock), []);
});
