import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// Vite's public directory copy must not turn untracked inputs into HEAD provenance.
export async function assertTrackedInputs(root, exhibit, trackedPaths) {
  const base = `absorb-alchemize/${exhibit}`;
  async function visit(relative) {
    for (const name of await readdir(path.join(root, relative))) {
      if (
        relative === base &&
        ['node_modules', 'dist', 'dist-ssr'].includes(name)
      )
        continue;
      const filename = `${relative}/${name}`;
      const fullPath = path.join(root, filename);
      const stat = await lstat(fullPath);
      if (stat.isSymbolicLink())
        throw new Error(`Symlink in exhibit input: ${filename}`);
      if (stat.isDirectory()) await visit(filename);
      else if (!stat.isFile() || !trackedPaths.has(filename))
        throw new Error(`Uncommitted exhibit input: ${filename}`);
      else {
        const bytes = await readFile(fullPath);
        if (
          bytes.length < 1024 &&
          bytes
            .toString()
            .startsWith('version https://git-lfs.github.com/spec/v1')
        ) {
          throw new Error(`Unhydrated LFS pointer in exhibit input: ${filename}`);
        }
      }
    }
  }
  await visit(base);
}
