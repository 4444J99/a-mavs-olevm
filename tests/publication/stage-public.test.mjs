import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  exhibits,
  staticExhibitFiles,
} from '../../scripts/publication-config.mjs';
import {
  inspectExhibit,
  isPublicSource,
  isLfsPointer,
  sha256,
  gitBlobId,
  stagePublic,
} from '../../scripts/stage-public.mjs';

import { verifyArtifact } from '../../scripts/verify-public-artifact.mjs';

import { assertTrackedInputs } from '../../scripts/check-public-inputs.mjs';
import { checkPublicationNeeds } from '../../scripts/verify-publication.mjs';

const temporary = [];
afterEach(async () => {
  for (const dir of temporary.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'publication-test-'));
  temporary.push(dir);
  const root = path.join(dir, 'source');
  await mkdir(root);
  const put = async (name, contents) => {
    const target = path.join(root, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  };
  const sourceFiles = [
    'index.html',
    '404.html',
    'manifest.json',
    'sw.js',
    'js/main.js',
    'img/photos/diary/diary1.jpg',
  ];
  const sourceBlobs = {};
  for (const name of sourceFiles) {
    const bytes = Buffer.from(`witness:${name}`);
    await put(name, bytes);
    sourceBlobs[name] = gitBlobId(bytes);
  }
  const receipt = {
    schemaVersion: 1,
    sourceCommit: 'a'.repeat(40),
    exhibits: {},
  };
  for (const name of exhibits) {
    await put(
      `absorb-alchemize/${name}/dist/index.html`,
      '<script type="module" src="./assets/entry.js"></script>'
    );
    await put(
      `absorb-alchemize/${name}/dist/assets/entry.js`,
      'console.log("compiled fixture")'
    );
    await put(`absorb-alchemize/${name}/package-lock.json`, '{}');
    for (const target of Object.values(staticExhibitFiles[name] || {}))
      await put(`absorb-alchemize/${name}/dist/${target}`, 'static fixture');
    receipt.exhibits[name] = {
      lockSha256: sha256('{}'),
      files: await inspectExhibit(root, name),
    };
  }
  return {
    root,
    output: path.join(dir, 'site'),
    receipt,
    sourceFiles,
    sourceBlobs,
    put,
  };
}

test('allowlist keeps public media and attribution, excludes repository and authoring material', () => {
  for (const name of [
    'index.html',
    'data/works.json',
    'img/photos/video/master.m3u8',
    'img/photos/video/segments/360p_000.ts',
    'img/photos/video/segments/init.m4s',
    'img/photos/artwork/passing thru/IMG_0901.JPG',
    'ogod/ogodtracks/01 I.mp3',
    'audio/albums/config.js',
    'img/icons/iconattribution.txt',
    'css/vendor/tachyons/license',
    'dependencies/images/111119-social-icons-rounded/license.pdf',
  ])
    assert.equal(isPublicSource(name), true, name);
  for (const name of [
    'README.md',
    'data/private.json',
    'data/works.json/private.json',
    'js/component.ts',
    'video/authoring.ts',
    'img/photos/../private.m3u8',
    '.git/config',
    'js/test/copy.js',
    'css/vendor/.git/config',
    'css/vendor/tachyons/package.json',
    'img/cover.psd',
    'img/originals.zip',
    'designs/draft.sketch',
    'absorb-alchemize/audio-orb/index.tsx',
    'templates/chamber-base.html',
    'js/../private.js',
  ])
    assert.equal(isPublicSource(name), false, name);
});
test('stages the exact works manifest and scoped HLS bytes while excluding unrelated data', async () => {
  const f = await fixture();
  const included = [
    'data/works.json',
    'img/photos/video/master.m3u8',
    'img/photos/video/segments/360p_000.ts',
  ];
  const excluded = ['data/private.json', 'js/authoring.ts'];
  for (const name of [...included, ...excluded]) {
    const bytes = Buffer.from(`gallery:${name}`);
    await f.put(name, bytes);
    f.sourceFiles.push(name);
    f.sourceBlobs[name] = gitBlobId(bytes);
  }
  const manifest = await stagePublic(f);
  for (const name of included) {
    assert.ok(manifest.files.some(file => file.path === name));
    assert.equal(
      await readFile(path.join(f.output, name), 'utf8'),
      `gallery:${name}`
    );
  }
  for (const name of excluded)
    assert.ok(!manifest.files.some(file => file.path === name));
});
test('stages all four built exhibits at existing nested URLs with exact hashes', async () => {
  const f = await fixture();
  const manifest = await stagePublic(f);
  assert.equal(manifest.files.length, f.sourceFiles.length + 11);
  for (const file of manifest.files)
    assert.equal(
      sha256(await readFile(path.join(f.output, file.path))),
      file.sha256
    );
  assert.equal(
    JSON.parse(await readFile(path.join(f.output, 'build-provenance.json')))
      .sourceCommit,
    f.receipt.sourceCommit
  );
});
test('missing exhibit fails before producing an upload directory', async () => {
  const f = await fixture();
  await rm(path.join(f.root, 'absorb-alchemize/synthwave-space/dist'), {
    recursive: true,
  });
  await assert.rejects(stagePublic(f), /ENOENT/);
  await assert.rejects(readFile(path.join(f.output, 'index.html')), /ENOENT/);
});
test('missing tracked public source fails instead of silently omitting sparse files', async () => {
  const f = await fixture();
  await rm(path.join(f.root, 'img/photos/diary/diary1.jpg'));
  await assert.rejects(stagePublic(f), /ENOENT/);
});
test('symlinked source and exhibit ancestors are rejected', async () => {
  const f = await fixture();
  await rm(path.join(f.root, 'js/main.js'));
  await symlink('../index.html', path.join(f.root, 'js/main.js'));
  await assert.rejects(stagePublic(f), /Symlink/);
  await rm(path.join(f.root, 'js/main.js'));
  await f.put('js/main.js', 'witness:js/main.js');
  await rm(path.join(f.root, 'absorb-alchemize/audio-orb/dist'), {
    recursive: true,
  });
  await symlink(
    '../not-real',
    path.join(f.root, 'absorb-alchemize/audio-orb/dist')
  );
  await assert.rejects(stagePublic(f), /Symlink/);
});
test('source files and nested repository metadata poison a bundle instead of being copied', async () => {
  for (const contaminant of [
    'source.tsx',
    'source.js.map',
    'original.psd',
    '.git/config',
    'package.json',
  ]) {
    const f = await fixture();
    await f.put(`absorb-alchemize/audio-orb/dist/${contaminant}`, 'private');
    await assert.rejects(
      stagePublic(f),
      /Source or unsupported|Repository material/
    );
  }
});
test('changed bundle or lockfile cannot reuse an earlier build receipt', async () => {
  const f = await fixture();
  await f.put('absorb-alchemize/audio-orb/dist/assets/entry.js', 'changed');
  await assert.rejects(stagePublic(f), /Build provenance mismatch/);
  f.receipt.exhibits['audio-orb'].files = await inspectExhibit(
    f.root,
    'audio-orb'
  );
  await f.put(
    'absorb-alchemize/audio-orb/package-lock.json',
    '{"changed":true}'
  );
  await assert.rejects(stagePublic(f), /Lockfile provenance mismatch/);
});
test('rejects root-relative source entries and missing compiled assets', async () => {
  const f = await fixture();
  await f.put(
    'absorb-alchemize/audio-orb/dist/index.html',
    '<script type="module" src="/index.tsx"></script>'
  );
  await assert.rejects(stagePublic(f), /relative compiled asset/);
  await f.put(
    'absorb-alchemize/audio-orb/dist/index.html',
    '<script type="module" src="./assets/missing.js"></script>'
  );
  await assert.rejects(stagePublic(f), /ENOENT/);
});
test('rejects a provider-key-shaped string in compiled output without printing it', async () => {
  const f = await fixture();
  const fake = 'AIza' + 'x'.repeat(35);
  await f.put(
    'absorb-alchemize/audio-orb/dist/assets/entry.js',
    `const fixture = '${fake}'`
  );
  await assert.rejects(
    stagePublic(f),
    error =>
      /credential pattern/.test(error.message) && !error.message.includes(fake)
  );
});
test('does not mix a candidate with an existing artifact or overwrite source', async () => {
  const f = await fixture();
  await mkdir(f.output);
  await assert.rejects(stagePublic(f), /already exists/);
  await assert.rejects(stagePublic({ ...f, output: f.root }), /Output must/);
});

test('download verification binds the complete artifact to the source and rejects tampering', async () => {
  const f = await fixture();
  const manifest = await stagePublic(f);
  assert.equal(
    await verifyArtifact(f.output, f.receipt.sourceCommit),
    manifest.files.length
  );
  await assert.rejects(
    verifyArtifact(f.output, 'b'.repeat(40)),
    /does not match/
  );
  await writeFile(path.join(f.output, 'unexpected.psd'), 'private');
  await assert.rejects(
    verifyArtifact(f.output, f.receipt.sourceCommit),
    /Unexpected publication file/
  );
  await rm(path.join(f.output, 'unexpected.psd'));
  await writeFile(path.join(f.output, 'index.html'), 'changed');
  await assert.rejects(
    verifyArtifact(f.output, f.receipt.sourceCommit),
    /checksum mismatch/
  );
  await rm(path.join(f.output, 'index.html'));
  await assert.rejects(
    verifyArtifact(f.output, f.receipt.sourceCommit),
    /incomplete/
  );
});

test('public build rejects provider environment variables before executing installers', async () => {
  const { spawnSync } = await import('node:child_process');
  const command = new URL(
    '../../scripts/build-public-exhibits.mjs',
    import.meta.url
  );
  const result = spawnSync(process.execPath, [command.pathname], {
    env: { ...process.env, GEMINI_API_KEY: 'non-secret-test-fixture' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Remove provider credentials/);
  assert.doesNotMatch(result.stderr, /non-secret-test-fixture/);
});

test('public build rejects local environment files before executing installers', async () => {
  const { spawnSync } = await import('node:child_process');
  const f = await fixture();
  await f.put(
    'absorb-alchemize/audio-orb/.env.local',
    'GEMINI_API_KEY=non-secret-test-fixture'
  );
  const command = new URL(
    '../../scripts/build-public-exhibits.mjs',
    import.meta.url
  );
  const result = spawnSync(process.execPath, [command.pathname], {
    cwd: f.root,
    env: { ...process.env, GEMINI_API_KEY: '', API_KEY: '' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Environment files cannot enter a public build/);
});

test('build input provenance rejects untracked public files even when locally ignored', async () => {
  const f = await fixture();
  const root = 'absorb-alchemize/audio-orb';
  const tracked = new Set([`${root}/package-lock.json`]);
  await assertTrackedInputs(f.root, 'audio-orb', tracked);
  await f.put(`${root}/public/private.json`, '{"private":"fixture"}');
  await assert.rejects(
    assertTrackedInputs(f.root, 'audio-orb', tracked),
    /Uncommitted exhibit input/
  );
  tracked.add(`${root}/public/private.json`);
  await assertTrackedInputs(f.root, 'audio-orb', tracked);
  await rm(path.join(f.root, root, 'public/private.json'));
  await symlink(
    '../../package-lock.json',
    path.join(f.root, root, 'public/private.json')
  );
  await assert.rejects(
    assertTrackedInputs(f.root, 'audio-orb', tracked),
    /Symlink in exhibit input/
  );
});

test('raw committed SVG bytes survive text-filter drift while real changes fail', async () => {
  const f = await fixture();
  const name = 'img/legacy.svg';
  const original = Buffer.from('<svg>\r\n  <path d="M 1 2" />\r\n</svg>\r\n');
  await f.put(name, original);
  f.sourceFiles.push(name);
  f.sourceBlobs[name] = gitBlobId(original);
  await stagePublic(f);
  assert.deepEqual(await readFile(path.join(f.output, name)), original);
  await f.put(name, original.toString().replaceAll('\r\n', '\n'));
  await assert.rejects(
    stagePublic({ ...f, output: `${f.output}-changed` }),
    /Public source differs from the committed blob/
  );
});

test('built HTML requires real nested stylesheets, favicons, and non-module resources', async () => {
  const f = await fixture();
  const base = 'absorb-alchemize/audio-orb/dist';
  const entry = '<script type="module" src="./assets/entry.js"></script>';
  for (const resource of [
    '<link rel="stylesheet" href="./assets/missing.css">',
    '<link rel="icon" href="./missing.ico">',
    '<img src="./missing.png">',
  ]) {
    await f.put(`${base}/index.html`, entry + resource);
    await assert.rejects(inspectExhibit(f.root, 'audio-orb'), /ENOENT/);
  }
  await f.put(
    `${base}/index.html`,
    entry + '<link rel="stylesheet" href="/index.css">'
  );
  await assert.rejects(
    inspectExhibit(f.root, 'audio-orb'),
    /HTML resource must be relative/
  );
  await f.put(
    `${base}/index.html`,
    entry + '<link rel="icon" href="../../../img/favicon.ico">'
  );
  await assert.rejects(
    inspectExhibit(f.root, 'audio-orb'),
    /HTML resource escapes/
  );
  await f.put(`${base}/assets/style.css`, 'body { color: black; }');
  await f.put(`${base}/assets/favicon.ico`, 'test icon');
  await f.put(
    `${base}/index.html`,
    entry +
      '<link rel="stylesheet" href="./assets/style.css"><link rel="icon" href="./assets/favicon.ico">'
  );
  const files = await inspectExhibit(f.root, 'audio-orb');
  assert.ok(files.some(file => file.path.endsWith('/assets/style.css')));
  assert.ok(files.some(file => file.path.endsWith('/assets/favicon.ico')));
});

test('unhydrated LFS pointer in exhibit assets fails visibly', async () => {
  const f = await fixture();
  const base = 'absorb-alchemize/audio-orb/dist';
  const lfsPointer =
    'version https://git-lfs.github.com/spec/v1\noid sha256:4d7a284486b2ae8101474d9c63d43860d9b4152034c38654381f6005ab083b49\nsize 12345\n';
  await f.put(`${base}/piz_compressed.exr`, lfsPointer);
  assert.ok(isLfsPointer(Buffer.from(lfsPointer)));
  await assert.rejects(
    inspectExhibit(f.root, 'audio-orb'),
    /Unhydrated LFS pointer in exhibit: absorb-alchemize\/audio-orb\/dist\/piz_compressed\.exr/
  );
});

test('unhydrated LFS pointer in public source fails visibly before staging', async () => {
  const f = await fixture();
  const lfsPointer =
    'version https://git-lfs.github.com/spec/v1\noid sha256:1111111111111111111111111111111111111111111111111111111111111111\nsize 54321\n';
  const name = 'img/photos/diary/diary1.jpg';
  await f.put(name, Buffer.from(lfsPointer));
  await assert.rejects(
    stagePublic(f),
    /Unhydrated LFS pointer in public source: img\/photos\/diary\/diary1\.jpg/
  );
});

test('unhydrated LFS pointer in exhibit inputs fails input provenance check', async () => {
  const f = await fixture();
  const root = 'absorb-alchemize/audio-orb';
  const lfsPointer =
    'version https://git-lfs.github.com/spec/v1\noid sha256:2222222222222222222222222222222222222222222222222222222222222222\nsize 999\n';
  const filename = `${root}/public/texture.png`;
  await f.put(filename, Buffer.from(lfsPointer));
  const tracked = new Set([`${root}/package-lock.json`, filename]);
  await assert.rejects(
    assertTrackedInputs(f.root, 'audio-orb', tracked),
    /Unhydrated LFS pointer in exhibit input: absorb-alchemize\/audio-orb\/public\/texture\.png/
  );
});

test('publication needs check reports blocked status and explicit per-exhibit requirements visibly', async () => {
  const f = await fixture();
  const needs = {
    schemaVersion: 1,
    issue: 'https://github.com/organvm-ii-poiesis/a-mavs-olevm/issues/94',
    successor: 'https://github.com/organvm-ii-poiesis/a-mavs-olevm/issues/144',
    status: 'blocked',
    exhibits: {
      'audio-orb':
        'Needs a server-issued short-lived session credential and a no-credential entry state',
      'gemini-ink-studio':
        'Needs an approved server credential boundary for voice control',
      'p5js-playground':
        'Needs a server generation endpoint with abuse controls',
      'synthwave-space':
        'Needs a server generation endpoint with abuse controls and a verified no-credential entry state',
    },
  };
  const needsFile = path.join(f.root, 'publication-needs.json');
  await writeFile(needsFile, JSON.stringify(needs, null, 2));

  const result = await checkPublicationNeeds(new URL(`file://${needsFile}`));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'blocked');
  assert.equal(result.missing.length, 4);
  assert.match(result.message, /audio-orb: Needs a server-issued/);
  assert.match(result.message, /gemini-ink-studio: Needs an approved/);
  assert.match(result.message, /p5js-playground: Needs a server generation/);
  assert.match(result.message, /synthwave-space: Needs a server generation/);
  assert.match(
    result.message,
    /https:\/\/github\.com\/organvm-ii-poiesis\/a-mavs-olevm\/issues\/94/
  );
});
