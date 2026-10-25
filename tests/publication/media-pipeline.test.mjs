import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const repo = path.resolve(import.meta.dirname, '../..');
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'works-pipeline-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts'));
  mkdirSync(path.join(root, 'data'));
  mkdirSync(path.join(root, 'input'));
  writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'));
  for (const script of [
    'ingest-media.mjs',
    'seed-works.mjs',
    'backfill-thumbs.mjs',
    'make-og.mjs',
    'transcode-video.js',
    'works-manifest.mjs',
  ]) {
    if (existsSync(path.join(repo, 'scripts', script)))
      copyFileSync(
        path.join(repo, 'scripts', script),
        path.join(root, 'scripts', script)
      );
  }
  const manifestPath = path.join(root, 'data/works.json');
  return {
    root,
    manifestPath,
    write: manifest => writeFileSync(manifestPath, JSON.stringify(manifest)),
    read: () => JSON.parse(readFileSync(manifestPath, 'utf8')),
    run: (script, args = []) =>
      spawnSync(
        process.execPath,
        [path.join(root, 'scripts', script), ...args],
        {
          encoding: 'utf8',
          timeout: 30000,
          env: { ...process.env, VIPS_CONCURRENCY: '1' },
        }
      ),
  };
}

const curated = {
  version: 1,
  profile: { name: 'Authored name', instagram: 'authored' },
  works: [
    {
      id: 'photography-sample',
      src: 'img/old.webp',
      title: 'Authored title',
      caption: 'Authored caption',
      tags: ['authored'],
      date: '2020',
      featured: true,
      ig_url: 'https://example.test/work',
      thumb: 'img/thumbs/existing.webp',
    },
  ],
};

test('the share-image CLI renders a real 1200 by 630 JPEG without changing its source', async t => {
  const f = fixture(t);
  mkdirSync(path.join(f.root, 'img'));
  const input = path.join(f.root, 'input/cover.png');
  await sharp({
    create: { width: 16, height: 12, channels: 3, background: 'blue' },
  })
    .png()
    .toFile(input);
  const before = readFileSync(input);
  const result = f.run('make-og.mjs', ['input/cover.png']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const meta = await sharp(path.join(f.root, 'img/og-image.jpg')).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.deepEqual(readFileSync(input), before);
});

test('a later ingest failure retains both catalog and previously referenced media bytes', async t => {
  const f = fixture(t);
  const relative = 'img/photos/photography/sample-8w.webp';
  const existing = path.join(f.root, relative);
  mkdirSync(path.dirname(existing), { recursive: true });
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'red' },
  })
    .webp()
    .toFile(existing);
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'blue' },
  })
    .png()
    .toFile(path.join(f.root, 'input/sample.png'));
  writeFileSync(path.join(f.root, 'input/zzbroken.jpg'), 'not an image');
  const manifest = structuredClone(curated);
  manifest.works[0].src = relative;
  f.write(manifest);
  const before = readFileSync(existing),
    catalog = readFileSync(f.manifestPath);
  const result = f.run('ingest-media.mjs', [
    path.join(f.root, 'input'),
    '--category',
    'Photography',
  ]);
  assert.notEqual(result.status, 0);
  assert.deepEqual(readFileSync(f.manifestPath), catalog);
  assert.deepEqual(readFileSync(existing), before);
});

test('a later forced-thumbnail failure retains all previously referenced thumbnail bytes', async t => {
  const f = fixture(t);
  const thumb = path.join(f.root, 'img/thumbs/first.webp');
  mkdirSync(path.dirname(thumb), { recursive: true });
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'red' },
  })
    .webp()
    .toFile(thumb);
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'blue' },
  })
    .png()
    .toFile(path.join(f.root, 'input/first.png'));
  writeFileSync(path.join(f.root, 'input/broken.jpg'), 'broken');
  f.write({
    version: 1,
    works: [
      { id: 'first', src: 'input/first.png', thumb: 'img/thumbs/first.webp' },
      { id: 'broken', src: 'input/broken.jpg' },
    ],
  });
  const before = readFileSync(thumb),
    catalog = readFileSync(f.manifestPath);
  const result = f.run('backfill-thumbs.mjs', ['--force']);
  assert.notEqual(result.status, 0);
  assert.deepEqual(readFileSync(f.manifestPath), catalog);
  assert.deepEqual(readFileSync(thumb), before);
});

test('malformed catalogs remain byte-identical on ingest and thumbnail failure', async t => {
  const f = fixture(t);
  await sharp({
    create: { width: 4, height: 3, channels: 3, background: 'red' },
  })
    .png()
    .toFile(path.join(f.root, 'input/sample.png'));
  for (const malformed of ['{bad', '{"works":{}}']) {
    for (const [script, args] of [
      [
        'ingest-media.mjs',
        [path.join(f.root, 'input'), '--category', 'Photography'],
      ],
      ['backfill-thumbs.mjs', []],
    ]) {
      writeFileSync(f.manifestPath, malformed);
      const result = f.run(script, args);
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.equal(readFileSync(f.manifestPath, 'utf8'), malformed);
    }
  }
});

test('repeated real image ingest preserves curation, profile and originals', async t => {
  const f = fixture(t);
  f.write(curated);
  const input = path.join(f.root, 'input/sample.png');
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'blue' },
  })
    .png()
    .toFile(input);
  const before = readFileSync(input);
  for (let index = 0; index < 2; index++) {
    const result = f.run('ingest-media.mjs', [
      path.dirname(input),
      '--category',
      'Photography',
    ]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const manifest = f.read();
    assert.deepEqual(manifest.profile, curated.profile);
    assert.equal(manifest.works.length, 1);
    for (const field of [
      'title',
      'caption',
      'tags',
      'date',
      'featured',
      'ig_url',
      'thumb',
    ])
      assert.deepEqual(
        manifest.works[0][field],
        curated.works[0][field],
        field
      );
    const work = manifest.works[0];
    assert.ok(existsSync(path.join(f.root, work.src)));
    for (const variant of [...work.srcset.avif, ...work.srcset.webp])
      assert.ok(existsSync(path.join(f.root, variant.split(' ')[0])));
    assert.deepEqual(readFileSync(input), before);
  }
});

test('failed image/video conversions never update the catalog or advertise external paths', t => {
  const f = fixture(t);
  f.write(curated);
  const before = readFileSync(f.manifestPath);
  for (const extension of ['jpg', 'mov']) {
    const input = path.join(f.root, 'input', `broken.${extension}`);
    writeFileSync(input, 'not media');
    const result = f.run('ingest-media.mjs', [
      path.dirname(input),
      '--category',
      'Photography',
    ]);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(readFileSync(f.manifestPath), before);
    rmSync(input);
  }
});

test('colliding seed and ingest names retain the catalog', t => {
  const f = fixture(t);
  f.write(curated);
  const before = readFileSync(f.manifestPath);
  mkdirSync(path.join(f.root, 'img/photos/media'), { recursive: true });
  for (const name of ['media1.jpg', 'media1.png'])
    writeFileSync(path.join(f.root, 'img/photos/media', name), 'fixture');
  const result = f.run('seed-works.mjs');
  assert.notEqual(result.status, 0);
  assert.deepEqual(readFileSync(f.manifestPath), before);
  for (const name of ['sample.jpg', 'sample.png'])
    writeFileSync(path.join(f.root, 'input', name), 'fixture');
  const ingest = f.run('ingest-media.mjs', [
    path.join(f.root, 'input'),
    '--category',
    'Photography',
  ]);
  assert.notEqual(ingest.status, 0);
  assert.match(ingest.stderr, /collide/);
  assert.deepEqual(readFileSync(f.manifestPath), before);
});

test('reseed retains curated records, missing collections and post-seed additions', t => {
  const f = fixture(t);
  mkdirSync(path.join(f.root, 'img/photos/media'), { recursive: true });
  writeFileSync(path.join(f.root, 'img/photos/media/media1.jpg'), 'fixture');
  const manifest = structuredClone(curated);
  manifest.works.push({
    id: 'media-media1',
    src: 'img/photos/media/media1.jpg',
    caption: 'Edited',
    w: 4000,
    thumb: 'img/thumbs/a.webp',
  });
  manifest.works.push({
    id: 'diary-diary1',
    src: 'img/photos/diary/diary1.jpg',
    caption: 'Missing mount retained',
  });
  f.write(manifest);
  for (let index = 0; index < 2; index++) {
    const result = f.run('seed-works.mjs');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(f.read(), manifest);
  }
});

test('failed thumbnail generation keeps existing catalog bytes and never invents a thumb', t => {
  const f = fixture(t);
  const manifest = structuredClone(curated);
  manifest.works[0].src = 'input/broken.jpg';
  delete manifest.works[0].thumb;
  writeFileSync(path.join(f.root, 'input/broken.jpg'), 'not an image');
  f.write(manifest);
  const before = readFileSync(f.manifestPath);
  const result = f.run('backfill-thumbs.mjs');
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(readFileSync(f.manifestPath), before);
});

test('video thumbnails use the poster while retaining video dimensions and source', async t => {
  const f = fixture(t);
  const poster = path.join(f.root, 'input/poster.png');
  await sharp({
    create: { width: 8, height: 6, channels: 3, background: 'green' },
  })
    .png()
    .toFile(poster);
  const work = {
    id: 'video-one',
    type: 'video',
    src: 'input/master.m3u8',
    hls: true,
    poster: 'input/poster.png',
    w: 1920,
    h: 1080,
  };
  f.write({ version: 1, works: [work] });
  const result = f.run('backfill-thumbs.mjs');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const actual = f.read().works[0];
  assert.equal(actual.src, work.src);
  assert.equal(actual.w, 1920);
  assert.equal(actual.h, 1080);
  assert.ok(existsSync(path.join(f.root, actual.thumb)));
});
