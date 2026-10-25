import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ serviceWorkers: 'allow' });
let server;
let origin;
let finishStream;

test.beforeAll(async () => {
  const worker = readFileSync(resolve('sw.js'));
  server = createServer((request, response) => {
    if (request.url === '/sw.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript' });
      response.end(worker);
    } else if (request.url === '/slow.mp3') {
      response.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      response.write('first');
      finishStream = () => response.end('last');
    } else {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(
        '<!doctype html><title>Worker boundary fixture</title>network'
      );
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterEach(() => {
  finishStream?.();
  finishStream = null;
});
test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

async function controlledPage(page) {
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {
          once: true,
        });
      });
  });
}

test('native worker streams first bytes while its cache write remains pending', async ({
  page,
}) => {
  await controlledPage(page);
  const first = page.evaluate(async () => {
    const response = await fetch('/slow.mp3');
    const chunk = await response.body.getReader().read();
    return new TextDecoder().decode(chunk.value);
  });
  try {
    // The HTTP source stays open until the foreground actually receives bytes.
    await expect(first).resolves.toBe('first');
  } finally {
    finishStream?.();
    finishStream = null;
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open('media-cache-v1-audio');
        return (await cache.match('/slow.mp3'))?.text();
      })
    )
    .toBe('firstlast');
});

test('native worker applies non-audio entry limits through its management protocol', async ({
  page,
}) => {
  await controlledPage(page);
  const result = await page.evaluate(async () => {
    const channel = new MessageChannel();
    const reply = new Promise(resolve => {
      channel.port1.onmessage = event => resolve(event.data);
    });
    navigator.serviceWorker.controller.postMessage(
      {
        type: 'UPDATE_CONFIG',
        payload: { cache: { maxMetadataEntries: 1 } },
      },
      [channel.port2]
    );
    return reply;
  });
  expect(result).toEqual({ success: true });
  for (const name of ['first', 'second']) {
    await page.evaluate(async name => {
      await (await fetch(`/media/metadata/${name}.json`)).text();
    }, name);
    // Observe each native background write rather than assume a timing delay.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const cache = await caches.open('media-cache-v1-metadata');
          return (await cache.keys()).map(
            request => new URL(request.url).pathname
          );
        })
      )
      .toEqual([`/media/metadata/${name}.json`]);
  }
});
