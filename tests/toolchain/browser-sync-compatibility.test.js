import assert from 'node:assert/strict';
import { test } from 'vitest';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import browserSync from 'browser-sync';

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// The scoped Immutable 4 override crosses BrowserSync's declared major range.
// Exercise its actual server/UI/reload path rather than claiming semver compatibility.
const fetch = globalThis.__nativeFetch || globalThis.fetch;
test(
  'BrowserSync with patched Immutable serves HTML, UI, and live reload',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'etceter4-browser-sync-'));
    const bs = browserSync.create();
    const serverPort = await getAvailablePort();
    const uiPort = await getAvailablePort();
    try {
      await writeFile(
        join(root, 'index.html'),
        '<html><body>ETCETER4 fixture</body></html>'
      );
      await new Promise((resolve, reject) =>
        bs.init(
          {
            server: root,
            listen: '127.0.0.1',
            port: serverPort,
            ui: { port: uiPort },
            open: false,
            notify: false,
            logLevel: 'silent',
          },
          error => (error ? reject(error) : resolve())
        )
      );
      const siteUrl = `http://127.0.0.1:${bs.instance.server.address().port}/`;
      const uiUrl = `http://127.0.0.1:${bs.instance.ui.server.address().port}/`;
      const page = await fetch(siteUrl, {
        headers: { accept: 'text/html' },
      });
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /ETCETER4 fixture/);
      assert.match(html, /browser-sync-client/);
      const ui = await fetch(uiUrl).then(response => response.text());
      assert.match(ui, /Browsersync/);
      const reload = once(bs.emitter, 'browser:reload');
      bs.reload();
      await reload;
    } finally {
      bs.exit();
      await rm(root, { recursive: true, force: true });
    }
  },
  15000
);
