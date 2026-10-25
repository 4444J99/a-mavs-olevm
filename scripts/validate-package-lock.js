#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

/** Resolve a dependency from its importing package, following Node's ancestry. */
function dependencyKeys(packageKey, dependency) {
  const candidates = [];
  let current = packageKey;
  while (current) {
    candidates.push(`${current}/node_modules/${dependency}`);
    const parent = current.lastIndexOf('/node_modules/');
    current = parent < 0 ? '' : current.slice(0, parent);
  }
  candidates.push(`node_modules/${dependency}`);
  return candidates;
}

/** Registry lock contract. Returns every failure; never edits either input. */
export function validatePackageLock(manifest, lock) {
  const errors = [];
  const isRecord = value =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!isRecord(manifest)) return ['The package manifest must be an object'];
  if (!lock || lock.lockfileVersion !== 3) {
    return ['A version 3 package lock is required'];
  }
  const packages = lock.packages;
  if (!isRecord(packages) || !Object.hasOwn(packages, ''))
    return ['The lock root package is missing'];
  if (!isRecord(packages[''])) return ['The lock root package is malformed'];
  const root = packages[''];
  for (const field of ['name', 'version']) {
    if (manifest[field] !== lock[field] || manifest[field] !== root[field]) {
      errors.push(`${field} differs between manifest and lock metadata`);
    }
  }
  for (const field of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]) {
    const declared = manifest[field] || {};
    const recorded = root[field] || {};
    for (const name of new Set([
      ...Object.keys(declared),
      ...Object.keys(recorded),
    ])) {
      if (declared[name] !== recorded[name]) {
        errors.push(`${field}.${name} differs between manifest and lock`);
      }
    }
  }
  for (const [key, entry] of Object.entries(packages)) {
    if (!isRecord(entry)) {
      errors.push(`${key || '<root>'}: invalid package entry`);
      continue;
    }
    if (key && !entry.link) {
      if (!semver.valid(entry.version))
        errors.push(`${key}: missing or invalid version`);
      if (
        typeof entry.resolved !== 'string' ||
        !entry.resolved.startsWith('https://registry.npmjs.org/')
      ) {
        errors.push(`${key}: expected an HTTPS npm registry resolution`);
      }
      if (
        !/^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity || '')
      ) {
        errors.push(`${key}: missing or invalid package integrity`);
      }
    }
    const declared = {
      ...entry.dependencies,
      ...(key === '' ? entry.devDependencies : {}),
      ...entry.optionalDependencies,
    };
    for (const [name, range] of Object.entries(declared)) {
      const resolvedKey = dependencyKeys(key, name).find(candidate =>
        Object.hasOwn(packages, candidate)
      );
      if (!resolvedKey) {
        if (!Object.hasOwn(entry.optionalDependencies || {}, name)) {
          errors.push(`${key || '<root>'}: unresolved dependency ${name}`);
        }
        continue;
      }
      const dependency = packages[resolvedKey];
      if (!isRecord(dependency)) {
        errors.push(`${resolvedKey}: invalid package entry`);
        continue;
      }
      const importer = key
        .split('/node_modules/')
        .at(-1)
        .replace(/^node_modules\//, '');
      const override = manifest.overrides?.[importer]?.[name];
      const effectiveRange = typeof override === 'string' ? override : range;
      if (
        !dependency.link &&
        (!semver.validRange(effectiveRange) ||
          !semver.satisfies(dependency.version, effectiveRange))
      ) {
        errors.push(
          `${key || '<root>'}: ${name}@${dependency.version} does not satisfy ${effectiveRange}`
        );
      }
    }
    // A peer is supplied at the importing package's parent level or above.
    // Optional peers may be absent; a present peer must still be compatible.
    const peerKeys = name => dependencyKeys(key, name).slice(key ? 1 : 0);
    for (const [name, range] of Object.entries(entry.peerDependencies || {})) {
      const resolvedKey = peerKeys(name).find(candidate =>
        Object.hasOwn(packages, candidate)
      );
      if (!resolvedKey) {
        if (entry.peerDependenciesMeta?.[name]?.optional !== true) {
          errors.push(`${key || '<root>'}: unresolved peer dependency ${name}`);
        }
        continue;
      }
      const peer = packages[resolvedKey];
      if (!isRecord(peer)) {
        errors.push(`${resolvedKey}: invalid package entry`);
      } else if (
        !peer.link &&
        (!semver.validRange(range) || !semver.satisfies(peer.version, range))
      ) {
        errors.push(
          `${key || '<root>'}: peer ${name}@${peer.version} does not satisfy ${range}`
        );
      }
    }
  }
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8')
    );
    const lock = JSON.parse(
      readFileSync(resolve(root, 'package-lock.json'), 'utf8')
    );
    const errors = validatePackageLock(manifest, lock);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else
      console.log(
        'Package lock metadata, ranges, resolution ancestry, and integrity pass.'
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
