/**
 * Visual Home E2E smoke
 * Verifies the new image-first front door actually boots, renders the
 * data-driven works grid, and the lightbox opens/closes.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test.use({ serviceWorkers: 'block' });

test('portrait photographs fit the remaining media area above a long caption', async ({
  page,
}) => {
  await page.route('**/data/works.json', route =>
    route.fulfill({
      json: {
        version: 1,
        works: [
          {
            id: 'portrait-proof',
            type: 'photo',
            src: 'img/photos/__portrait__.svg',
            title: 'Portrait',
            caption: 'Caption with authored detail. '.repeat(50),
          },
        ],
      },
    })
  );
  await page.route('**/__portrait__.svg', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="1000"><rect width="100" height="1000" fill="blue"/></svg>',
    })
  );
  await page.goto('/');
  await page.locator('#works-grid .gallery-item').click();
  const image = page.locator('.lightbox-image-container img');
  await expect
    .poll(() => image.evaluate(element => element.naturalHeight))
    .toBe(1000);
  const bounds = await image.boundingBox();
  const container = await page
    .locator('.lightbox-image-container')
    .boundingBox();
  expect(bounds.height).toBeLessThanOrEqual(container.height + 1);
  expect(bounds.width).toBeLessThanOrEqual(container.width + 1);
  expect(bounds.height / bounds.width).toBeCloseTo(10, 1);
});

test.describe('Visual Home front door', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('boots to #visual-home and renders the works grid', async ({
    page,
  }, testInfo) => {
    await expect(page.locator('#visual-home')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#works-grid .gallery-item').first()).toBeVisible(
      { timeout: 15000 }
    );
    const count = await page.locator('#works-grid .gallery-item').count();
    const manifest = await (await page.request.get('/data/works.json')).json();
    expect(count).toBe(manifest.works.length);
    expect(count).toBe(227);
    await expect
      .poll(() => page.evaluate(() => window.etceter4Startup))
      .toMatchObject({ status: 'ready', route: '#visual-home' });
    await expect
      .poll(() =>
        page
          .locator('#works-grid img')
          .first()
          .evaluate(image => image.complete && image.naturalWidth > 0)
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.locator('#works-grid img').evaluateAll(images =>
          images
            .filter(image => {
              const bounds = image.getBoundingClientRect();
              return bounds.top < innerHeight && bounds.bottom > 0;
            })
            .every(
              image =>
                image.complete &&
                image.naturalWidth > 0 &&
                getComputedStyle(image).opacity === '1'
            )
        )
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath('visual-home.png') });
  });

  test('opens and closes the lightbox', async ({ page }) => {
    const firstItem = page.locator('#works-grid .gallery-item').first();
    await firstItem.waitFor({ state: 'visible', timeout: 15000 });
    await firstItem.click();
    await expect(page.locator('#visual-home .lightbox')).toHaveClass(/active/);
    await expect(page.locator('.lightbox-counter')).toContainText('/');
    await expect(page.locator('.lightbox-close')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.lightbox-caption')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.lightbox-close')).toBeFocused();
    await expect
      .poll(() =>
        page
          .locator('.lightbox-image-container img')
          .evaluate(image => image.complete && image.naturalWidth > 0)
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#visual-home .lightbox')).not.toHaveClass(
      /active/
    );
    await expect(firstItem).toBeFocused();
  });

  test('hero exposes Studies and Instagram links', async ({ page }) => {
    await expect(page.locator('#visual-home')).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('#visual-home .works-hero-link[href="#akademia"]')
    ).toBeVisible();
    await expect(page.locator('#works-ig-link')).toHaveAttribute(
      'href',
      /instagram\.com/
    );
  });

  test('native keyboard activation opens a work and advances exactly once', async ({
    page,
  }) => {
    const first = page.locator('#works-grid .gallery-item').first();
    await first.focus();
    await first.press('Space');
    await expect(page.locator('.lightbox')).toHaveClass(/active/);
    await expect(page.locator('.lightbox-close')).toBeFocused();
    await page.locator('.lightbox-nav.next').press('Enter');
    await expect(page.locator('.lightbox-counter')).toHaveText('2 / 227');
    await page.keyboard.press('Escape');
    await expect(page.locator('#visual-home')).toBeVisible();
    await expect(first).toBeFocused();
  });

  test('global search takes modal ownership from the viewer and remains editable', async ({
    page,
  }) => {
    await page.locator('#works-grid .gallery-item').first().click();
    await expect(page.locator('.lightbox')).toHaveClass(/active/);
    await page.keyboard.press('Control+k');
    await expect(page.locator('.lightbox')).not.toHaveClass(/active/);
    await expect(page.locator('#searchModal')).toBeVisible();
    await expect(page.locator('#globalSearchInput')).toBeFocused();
    await page.locator('#globalSearchInput').fill('OGOD');
    await expect(page.locator('#globalSearchResults')).toContainText(/OGOD/i);
    await page.keyboard.press('Escape');
    await expect(page.locator('#searchModal')).toBeHidden();
    await expect(page.locator('#visual-home')).toBeVisible();
  });

  test('filters actual works and opens the authored Studies then the labyrinth', async ({
    page,
  }) => {
    await page.locator('#works-filters [data-category="Generative"]').click();
    await expect(page.locator('#works-grid .gallery-item')).toHaveCount(41);
    await page.locator('#visual-home a[href="#akademia"]').click();
    await expect(page.locator('#akademia')).toBeVisible();
    await expect(page.locator('#akademia')).toContainText(
      'Force-Driven Line Systems'
    );
    await expect(page.locator('#akademia')).toContainText(
      'Noise-Field Particle Studies'
    );
    await expect(page.locator('#akademia')).toContainText(
      'Audio-Reactive GLSL Shaders'
    );
    await page.goBack();
    await expect(page.locator('#visual-home')).toBeVisible();
    await page.locator('#visual-home a[href="#landing"]').click();
    await expect(page.locator('#landing')).toBeVisible();
    await page.getByRole('link', { name: 'Enter site', exact: true }).click();
    await expect(page.locator('#menu')).toBeVisible();
  });

  test('visual home and open viewer satisfy WCAG AA checks', async ({
    page,
  }) => {
    await expect(page.locator('#visual-home')).toBeVisible();
    for (const open of [false, true]) {
      if (open) {
        await page.locator('#works-grid .gallery-item').first().click();
        await expect
          .poll(() =>
            page
              .locator('.lightbox')
              .evaluate(element => getComputedStyle(element).opacity)
          )
          .toBe('1');
      }
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map(item => ({
          id: item.id,
          nodes: item.nodes.map(node => node.target),
        }))
      ).toEqual([]);
    }
  });
});

test('HLS work uses the shared player, decodes actual segments, and releases on close', async ({
  page,
}) => {
  const source = 'img/photos/__visual-proof__/master.m3u8';
  await page.route('**/data/works.json', route =>
    route.fulfill({
      json: {
        version: 1,
        works: [
          {
            id: 'hls-proof',
            type: 'video',
            src: source,
            hls: true,
            title: 'HLS fixture',
            poster: 'img/thumbs/media-media1.webp',
          },
        ],
      },
    })
  );
  await page.route('**/img/photos/__visual-proof__/**', async route => {
    const name = new URL(route.request().url()).pathname.split(
      '/__visual-proof__/'
    )[1];
    const allowed = ['master.m3u8', '360p.m3u8', 'segments/360p_000.ts'];
    if (!allowed.includes(name)) return route.abort();
    const body = await readFile(
      new URL(`../media-fixtures/visual-home-hls/${name}`, import.meta.url)
    );
    await route.fulfill({
      body,
      contentType: name.endsWith('.ts')
        ? 'video/mp2t'
        : 'application/vnd.apple.mpegurl',
    });
  });
  await page.goto('/');
  await page.locator('#works-grid .gallery-item').click();
  const video = page.locator('.lightbox video');
  await expect
    .poll(() => video.evaluate(element => element.readyState))
    .toBeGreaterThanOrEqual(2);
  const bounds = await video.boundingBox();
  const container = await page
    .locator('.lightbox-image-container')
    .boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(bounds.width).toBeLessThanOrEqual(container.width + 1);
  expect(bounds.height).toBeLessThanOrEqual(container.height + 1);
  await video.evaluate(element => {
    element.muted = true;
    return element.play();
  });
  await expect
    .poll(() => video.evaluate(element => element.currentTime))
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox video')).toHaveCount(0);
  await expect(page.locator('#visual-home')).toBeVisible();
  expect(
    await page.evaluate(() => document.body.classList.contains('lightbox-open'))
  ).toBe(false);
});

test('failed gallery startup recovers landing and the retry loads the real manifest', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/data/works.json', route =>
    ++requests === 1
      ? route.fulfill({ status: 503, body: 'Unavailable' })
      : route.continue()
  );
  await page.goto('/');
  await expect(page.locator('#landing')).toBeVisible();
  await page
    .getByRole('button', { name: 'Retry section', exact: true })
    .click();
  await expect(page.locator('#visual-home')).toBeVisible();
  await expect(page.locator('#works-grid .gallery-item')).toHaveCount(227);
  expect(requests).toBe(2);
});
