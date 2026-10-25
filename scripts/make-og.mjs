#!/usr/bin/env node

/**
 * @file make-og.mjs
 * @description Generate the social share image `img/og-image.jpg` (1200×630).
 *
 * Cover-crops a representative work, darkens it with a bottom gradient, and
 * overlays the ETCETER4 wordmark + discipline line so shared links (the
 * Instagram bio link, etc.) render branded instead of blank.
 *
 * The site is a hash-routed SPA, so crawlers only ever see one URL — a single
 * strong branded share image is the right surface (per-route OG would require
 * pre-rendered share pages, a later add-on).
 *
 * Reproducible: pass a different source to re-render.
 * Usage:
 *   node scripts/make-og.mjs                         # default source
 *   node scripts/make-og.mjs img/photos/slip/slip1.jpg
 */

import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1200;
const HEIGHT = 630;
const source = process.argv[2] || 'img/photos/media/media1.jpg';
const srcPath = join(ROOT, source);

if (!existsSync(srcPath)) {
  console.error('make-og: source not found:', srcPath);
  process.exit(1);
}

const overlay = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
  <text x="64" y="${HEIGHT - 120}" font-family="Helvetica, Arial, sans-serif"
        font-size="96" letter-spacing="12" fill="#ffffff" font-weight="400">ETCETER4</text>
  <text x="68" y="${HEIGHT - 64}" font-family="Helvetica, Arial, sans-serif"
        font-size="27" letter-spacing="7" fill="#ff00ff">PHOTOGRAPHY · VIDEO · MULTIMEDIA · STUDIES</text>
</svg>`;

const base = await sharp(srcPath)
  .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
  .toBuffer();

await sharp(base)
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(ROOT, 'img/og-image.jpg'));

console.log(`Wrote img/og-image.jpg (${WIDTH}x${HEIGHT}) from ${source}`);
