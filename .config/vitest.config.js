/**
 * Vitest Configuration
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

export default defineConfig({
  test: {
    // Test directory (relative to project root)
    dir: projectRoot,
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'tests/toolchain/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'tests/governance/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
    ],

    // Environment for DOM testing
    environment: 'jsdom',

    // Make global mocks available
    globals: true,

    // Setup files
    setupFiles: [resolve(projectRoot, 'tests/unit/setup.js')],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: resolve(projectRoot, 'coverage'),
      include: [
        'js/3d/**/*.js',
        'js/*.js',
        'js/modules/**/*.js',
        'js/generative/**/*.js',
        'js/ergasterion/**/*.js',
        'js/discovery/**/*.js',
      ],
      exclude: ['js/3d/shaders/**', 'js/3d/**/vendor/**', 'js/vendor/**'],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },

    // Global timeout
    testTimeout: 10000,

    // Reporter
    reporter: ['verbose'],
  },
});
