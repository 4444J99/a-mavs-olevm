import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { resolve } from 'node:path';

const setupSource = readFileSync(
  resolve(process.cwd(), 'tests/unit/setup.js'),
  'utf8'
)
  .replace("import { vi } from 'vitest';", '')
  .replace(/export\s*\{[^}]*\};\s*$/, '');

describe('shared setup in a getter-only browser environment', () => {
  it('installs usable storage and device mocks without assigning readonly Window properties', () => {
    const sandbox = { vi, document, Event, console };
    sandbox.global = sandbox;
    Object.defineProperty(sandbox, 'window', { get: () => sandbox });
    Object.defineProperty(sandbox, 'localStorage', {
      get: () => ({ unavailable: true }),
      configurable: true,
    });
    Object.defineProperty(sandbox, 'navigator', {
      get: () => ({ userAgent: 'original browser' }),
      configurable: true,
    });

    expect(() =>
      runInContext(`'use strict';\n${setupSource}`, createContext(sandbox))
    ).not.toThrow();
    sandbox.localStorage.setItem('number', 42);
    expect(sandbox.localStorage.getItem('number')).toBe('42');
    expect(sandbox.localStorage.length).toBe(1);
    expect(sandbox.localStorage.key(0)).toBe('number');
    sandbox.window.localStorage.removeItem('number');
    expect(sandbox.localStorage.getItem('number')).toBeNull();
    sandbox.localStorage.setItem('reset', 'value');
    sandbox.localStorage.clear();
    expect(sandbox.localStorage.length).toBe(0);
    expect(sandbox.navigator.xr.isSessionSupported).toBeTypeOf('function');
    expect(sandbox.THREE.Vector3).toBeTypeOf('function');
    expect(sandbox.Howl).toBeTypeOf('function');
  });
});
