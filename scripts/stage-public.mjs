import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  exhibits,
  rootFiles,
  publicRoots,
  publicExtensions,
  exhibitExtensions,
  staticExhibitFiles,
} from './publication-config.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const gitBlobId = bytes =>
  createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
export const isLfsPointer = bytes =>
  (Buffer.isBuffer(bytes) || typeof bytes === 'string') &&
  bytes.length < 1024 &&
  bytes.toString().startsWith('version https://git-lfs.github.com/spec/v1');
const hidden = name =>
  name.startsWith('.') ||
  ['node_modules', 'test', 'tests', '__tests__'].includes(name);
const safePath = name =>
  name &&
  !name.includes('\\') &&
  !path.posix.isAbsolute(name) &&
  name.split('/').every(part => part && part !== '..' && !hidden(part));

export function isPublicSource(name) {
  if (!safePath(name)) return false;
  if (rootFiles.has(name)) return true;
  return (
    publicRoots.has(name.split('/')[0]) &&
    publicExtensions.has(path.posix.extname(name).toLowerCase()) &&
    !['package.json', 'package-lock.json', 'bower.json'].includes(
      path.posix.basename(name)
    )
  );
}

async function checkedFile(root, name) {
  if (!safePath(name)) throw new Error(`Unsafe artifact path: ${name}`);
  let current = root;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink())
      throw new Error(`Symlink is not publishable: ${name}`);
  }
  if (!(await lstat(current)).isFile())
    throw new Error(`Not a regular file: ${name}`);
  return current;
}

// Vite only rewrites resources it can resolve; missing template links can survive
// a successful bundle. Every local HTML resource must resolve inside this exhibit.
async function validateHtmlResources(root, filename, base) {
  const html = await readFile(path.join(root, filename), 'utf8');
  const tags = [
    ...html.matchAll(
      /<(?:script|link|img|source|audio|video|iframe)\b[^>]*>/gi
    ),
  ];
  for (const [tag] of tags) {
    const attributes = [
      ...tag.matchAll(
        /\b(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
      ),
    ];
    for (const attribute of attributes) {
      const value = attribute[1] ?? attribute[2] ?? attribute[3];
      if (/^(?:https?:|data:|blob:|\/\/|#)/i.test(value)) continue;
      if (!value || value.startsWith('/') || value.includes('\\')) {
        throw new Error(
          `HTML resource must be relative to the exhibit: ${filename}: ${value}`
        );
      }
      const url = new URL(value, `https://publication.invalid/${filename}`);
      const target = decodeURIComponent(url.pathname).slice(1);
      if (
        url.origin !== 'https://publication.invalid' ||
        !target.startsWith(`${base}/`)
      ) {
        throw new Error(
          `HTML resource escapes the exhibit: ${filename}: ${value}`
        );
      }
      await checkedFile(root, target);
    }
  }
}

export async function inspectExhibit(root, name) {
  const base = `absorb-alchemize/${name}/dist`;
  const files = [];
  async function visit(relative) {
    const stat = await lstat(path.join(root, relative));
    if (stat.isSymbolicLink())
      throw new Error(`Symlink is not publishable: ${relative}`);
    if (stat.isDirectory()) {
      for (const item of (await readdir(path.join(root, relative))).sort()) {
        if (hidden(item))
          throw new Error(
            `Repository material in exhibit: ${relative}/${item}`
          );
        await visit(`${relative}/${item}`);
      }
      return;
    }
    const full = await checkedFile(root, relative);
    if (
      !exhibitExtensions.has(path.extname(relative).toLowerCase()) ||
      [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'metadata.json',
      ].includes(path.basename(relative))
    ) {
      throw new Error(`Source or unsupported file in exhibit: ${relative}`);
    }
    const bytes = await readFile(full);
    if (isLfsPointer(bytes)) {
      throw new Error(`Unhydrated LFS pointer in exhibit: ${relative}`);
    }
    if (
      ['.html', '.js', '.json'].includes(path.extname(relative)) &&
      /AIza[0-9A-Za-z_-]{35}/.test(bytes.toString())
    ) {
      throw new Error(`Provider credential pattern in exhibit: ${relative}`);
    }
    files.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await checkedFile(root, `${base}/index.html`);
  await visit(base);
  for (const target of Object.values(staticExhibitFiles[name] || {})) {
    await checkedFile(root, `${base}/${target}`);
  }
  const html = await readFile(path.join(root, base, 'index.html'), 'utf8');
  const modules = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map(match => match[0])
    .filter(tag => /\btype=["']module["']/i.test(tag))
    .map(tag => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  if (!modules.length)
    throw new Error(`Missing compiled entry script: ${name}`);
  for (const url of modules) {
    if (!url.startsWith('./assets/') || !url.endsWith('.js'))
      throw new Error(
        `Exhibit entry must be a relative compiled asset: ${name}: ${url}`
      );
    await checkedFile(root, `${base}/${url.slice(2)}`);
  }
  for (const file of files.filter(file => file.path.endsWith('.html'))) {
    await validateHtmlResources(root, file.path, base);
  }
  return files;
}

export async function stagePublic({
  root,
  output,
  receipt,
  sourceFiles,
  sourceBlobs,
}) {
  root = path.resolve(root);
  output = path.resolve(output);
  if (
    output === root ||
    (!path.relative(root, output).startsWith('..') &&
      path.relative(root, output) !== '_site')
  ) {
    throw new Error('Output must be _site or outside the source checkout');
  }
  // Never merge into an old artifact: an earlier successful build is not evidence.
  try {
    await lstat(output);
    throw new Error(`Output already exists: ${output}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (
    !/^[a-f0-9]{40}$/.test(receipt.sourceCommit) ||
    receipt.schemaVersion !== 1
  )
    throw new Error('Invalid build provenance');
  const planned = [];
  for (const name of sourceFiles.filter(isPublicSource).sort()) {
    const full = await checkedFile(root, name);
    const bytes = await readFile(full);
    // Compare raw committed bytes. Git's text filters can report an untouched
    // historical CRLF SVG as dirty; normalization must not rewrite artwork.
    if (!sourceBlobs || gitBlobId(bytes) !== sourceBlobs[name]) {
      if (isLfsPointer(bytes)) {
        throw new Error(`Unhydrated LFS pointer in public source: ${name}`);
      }
      throw new Error(`Public source differs from the committed blob: ${name}`);
    }
    planned.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  for (const required of ['index.html', '404.html', 'manifest.json', 'sw.js']) {
    if (!planned.some(file => file.path === required))
      throw new Error(`Required public source missing: ${required}`);
  }
  for (const name of exhibits) {
    const actual = await inspectExhibit(root, name);
    if (
      JSON.stringify(actual) !== JSON.stringify(receipt.exhibits[name]?.files)
    )
      throw new Error(`Build provenance mismatch: ${name}`);
    const lock = await readFile(
      await checkedFile(root, `absorb-alchemize/${name}/package-lock.json`)
    );
    if (sha256(lock) !== receipt.exhibits[name].lockSha256)
      throw new Error(`Lockfile provenance mismatch: ${name}`);
    planned.push(...actual);
  }
  // Validate everything before any output directory is created.
  await mkdir(output, { recursive: true });
  for (const file of planned) {
    const target = path.join(output, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file.path), target);
    if (sha256(await readFile(target)) !== file.sha256)
      throw new Error(`Source changed while staging: ${file.path}`);
  }
  await writeFile(path.join(output, '.nojekyll'), '');
  const manifest = {
    ...receipt,
    files: planned.sort((a, b) => a.path.localeCompare(b.path)),
  };
  await writeFile(
    path.join(output, 'build-provenance.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = process.cwd();
  const receipt = JSON.parse(
    await readFile(path.join(root, '.publication/exhibits.json'), 'utf8')
  );
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  if (receipt.sourceCommit !== commit)
    throw new Error('Exhibit builds belong to a different commit');
  const entries = execFileSync('git', ['ls-tree', '-rz', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  const sourceBlobs = Object.fromEntries(
    entries.map(entry => {
      const tab = entry.indexOf('\t');
      const [, type, sha] = entry.slice(0, tab).split(' ');
      if (type !== 'blob')
        throw new Error('Submodules require a reviewed publication policy');
      return [entry.slice(tab + 1), sha];
    })
  );
  const sourceFiles = Object.keys(sourceBlobs);
  const manifest = await stagePublic({
    root,
    output: path.join(root, '_site'),
    receipt,
    sourceFiles,
    sourceBlobs,
  });
  console.log(
    `Staged ${manifest.files.length} files from ${commit}; runtime activation remains separately gated.`
  );
}
