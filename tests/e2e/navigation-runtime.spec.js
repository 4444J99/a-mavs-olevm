/** Native navigation proof: never force visibility, routing state, or modal styles. */
import { test, expect } from '@playwright/test';

// Failure injection must reach the network instead of a previous cache entry.
test.use({ serviceWorkers: 'block' });

// These tests use the page's production scripts. Test infrastructure may fulfill
// CDN URLs with byte-identical SRI-verified files; it must not replace routing.
test('enter, content link, Escape and browser history change visible pages', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Enter site', exact: true }).click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#landing')).toBeHidden();
  await page.locator('#toVisionPage').click();
  await expect(page.locator('#vision')).toBeVisible();
  await expect(page.locator('#menu')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#vision')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#menu')).toBeVisible();
});

test('a failed fragment leaves navigation available and its retry loads real content', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/chambers/diary/fragment.html', route => {
    requests += 1;
    return requests === 1
      ? route.fulfill({ status: 503, body: 'Unavailable' })
      : route.continue();
  });
  await page.goto('/#words');
  await page.locator('#toDiaryPage').click();
  await expect(page.getByRole('alert')).toContainText('could not load');
  await expect(page.locator('#words')).toBeVisible();
  await expect(page).toHaveURL(/#words$/);
  await page.getByRole('button', { name: 'Retry section' }).click();
  await expect(page.locator('#diary')).toBeVisible();
  await expect(page.locator('#stills-left-diary')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toBe(2);
});

test('a failed destination does not add a duplicate browser history entry', async ({
  page,
}) => {
  await page.route('**/chambers/diary/fragment.html', route =>
    route.fulfill({ status: 503, body: 'Unavailable' })
  );
  await page.goto('/#menu');
  await page.locator('#toWordsPage').press('Enter');
  await expect(page.locator('#words')).toBeVisible();
  const entries = await page.evaluate(() => history.length);
  await page.locator('#toDiaryPage').press('Enter');
  await expect(page.getByRole('alert')).toContainText('could not load');
  expect(await page.evaluate(() => history.length)).toBe(entries);
  await page.goBack();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page).toHaveURL(/#menu$/);
});

test('a later keyboard route survives a slow failed chamber request', async ({
  page,
}) => {
  let release;
  let started;
  const requested = new Promise(resolve => {
    started = resolve;
  });
  await page.route('**/chambers/diary/fragment.html', async route => {
    started();
    await new Promise(resolve => {
      release = resolve;
    });
    await route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('/#words');
  await page.locator('#toDiaryPage').press('Enter');
  await requested;
  await page.keyboard.press('Escape');
  release();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page).toHaveURL(/#menu$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a failed direct URL has a visible recovery route', async ({ page }) => {
  await page.route('**/chambers/diary/fragment.html', route =>
    route.fulfill({ status: 503, body: 'Unavailable' })
  );
  await page.goto('/#diary');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page).toHaveURL(/#landing$/);
  await expect(
    page.getByRole('button', { name: 'Retry section' })
  ).toBeVisible();
  await page.getByRole('link', { name: 'Enter site', exact: true }).click();
  await expect(page.locator('#menu')).toBeVisible();
});

test('first search shortcut initializes listeners, displays results, and Escape closes only search', async ({
  page,
}) => {
  await page.goto('/#menu');
  await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('#searchModal')).toBeVisible();
  await page.locator('#globalSearchInput').fill('OGOD');
  await expect(page.locator('#globalSearchResults')).toContainText(/OGOD/i);
  await page.keyboard.press('Escape');
  await expect(page.locator('#searchModal')).toBeHidden();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page).toHaveURL(/#menu$/);
});

test('missing Velocity retains usable navigation', async ({ page }) => {
  await page.route('**/*velocity*.js', route => route.abort());
  await page.goto('/');
  await page.getByRole('link', { name: 'Enter site', exact: true }).click();
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#toVisionPage').click();
  await expect(page.locator('#vision')).toBeVisible();
});

test('missing core scripts leaves readable links to standalone work', async ({
  page,
}) => {
  await page.route('**/*jquery*.js', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#runtime-fallback')).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Available works' })
      .getByRole('link', { name: 'OGOD', exact: true })
  ).toHaveAttribute('href', 'OGOD.html');
  await expect(page.getByRole('button', { name: 'Reload site' })).toBeVisible();
});

test('failed chamber script is fetched again before retry can succeed', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/js/diary.js', route => {
    requests += 1;
    return requests === 1 ? route.abort() : route.continue();
  });
  await page.goto('/#words');
  await page.locator('#toDiaryPage').click();
  await expect(page.getByRole('alert')).toContainText('could not load');
  await expect(page.locator('#words')).toBeVisible();
  await page.getByRole('button', { name: 'Retry section' }).click();
  await expect(page.locator('#diary')).toBeVisible();
  await expect(page.locator('#stills-left-diary')).toBeVisible();
  expect(requests).toBe(2);
});

test('mobile menu accepts a native click and closes after navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.c-hamburger');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.mobileMenu')).toHaveClass(/open/);
  await page.locator('.mobileMenu a[href="#vision"]').click();
  await expect(page.locator('#vision')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.mobileMenu')).not.toHaveClass(/open/);
});
