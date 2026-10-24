/** Startup failure proofs use production scripts and real standalone routes. */
import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference' });

for (const script of ['pageData.js', 'main.js']) {
  test(`missing ${script} exposes working standalone links even when jQuery and Page loaded`, async ({
    page,
  }) => {
    let blocked = 0;
    await page.route(`**/js/${script}`, route => {
      blocked += 1;
      return route.abort();
    });
    await page.goto('/');
    expect(
      await page.evaluate(() => ({
        jquery: typeof window.jQuery,
        page: typeof Page,
      }))
    ).toEqual({ jquery: 'function', page: 'function' });
    expect(blocked).toBeGreaterThan(0);

    const fallback = page.locator('#runtime-fallback');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('could not start');
    await expect(
      fallback.getByRole('button', { name: 'Reload site', exact: true })
    ).toBeVisible();
    const works = fallback.getByRole('navigation', { name: 'Available works' });
    await expect(
      works.getByRole('link', { name: 'Text labyrinth', exact: true })
    ).toHaveAttribute('href', 'loophole.html');

    // Clicking the production fallback must load an actual standalone artwork;
    // an href-only assertion would permit a decorative but unusable recovery UI.
    await works.getByRole('link', { name: 'OGOD', exact: true }).click();
    await expect(page).toHaveURL(/\/OGOD\.html$/);
    await expect(page.locator('#OGODvisual')).toBeVisible();
    await expect(page.locator('#OGODvisual')).toContainText('OGOD I : XXIX');
  });
}

test('a delayed initial chamber can finish startup without a false fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__startupFallbackAppearances = 0;
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node.id === 'runtime-fallback' ||
              node.querySelector('#runtime-fallback'))
          ) {
            window.__startupFallbackAppearances += 1;
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  let release;
  let observed;
  const released = new Promise(resolve => {
    release = resolve;
  });
  const requested = new Promise(resolve => {
    observed = resolve;
  });
  await page.route('**/chambers/bibliotheke/fragment.html', async route => {
    observed();
    await released;
    await route.continue();
  });
  try {
    await page.goto('/#bibliotheke', { waitUntil: 'domcontentloaded' });
    await requested;
    // The request is held by the test; no routing state or DOM is overwritten.
    // Let DOMContentLoaded, jQuery.ready and the fallback check all run while the
    // real startup promise is legitimately waiting for its first chamber.
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.etceter4Startup?.status)).toBe(
      'starting'
    );
    await expect(page.locator('#runtime-fallback')).toHaveCount(0);
    await expect(page.locator('#bibliotheke')).toBeHidden();
  } finally {
    release();
  }

  await expect(page.locator('#bibliotheke')).toBeVisible();
  await expect(page).toHaveURL(/#bibliotheke$/);
  await expect(page.locator('#runtime-fallback')).toHaveCount(0);
  expect(await page.evaluate(() => window.__startupFallbackAppearances)).toBe(
    0
  );
  expect(await page.evaluate(() => window.etceter4Startup)).toMatchObject({
    status: 'ready',
    route: '#bibliotheke',
  });
  await expect
    .poll(() =>
      page.evaluate(() => ({
        initialized: window.livingPantheonCoreInstance?.isInitialized,
        chamber: window.livingPantheonCoreInstance?.currentChamberId,
      }))
    )
    .toEqual({ initialized: true, chamber: 'bibliotheke' });
});

test('a failed initial Bibliotheke deep link recovers landing and initializes Living Pantheon', async ({
  page,
}) => {
  await page.route('**/chambers/bibliotheke/fragment.html', route =>
    route.fulfill({ status: 503, body: 'Unavailable' })
  );
  await page.goto('/#bibliotheke');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page).toHaveURL(/#landing$/);
  await expect(
    page.getByRole('button', { name: 'Retry section', exact: true })
  ).toBeVisible();
  await expect(page.locator('#runtime-fallback')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.etceter4Startup))
    .toMatchObject({ status: 'ready', route: '#landing' });

  // Observe the production initializer's actual effect, without installing a
  // replacement initializer or pre-creating the singleton from test code.
  await expect
    .poll(() =>
      page.evaluate(() => ({
        initialized: window.livingPantheonCoreInstance?.isInitialized,
        chamber: window.livingPantheonCoreInstance?.currentChamberId,
      }))
    )
    .toEqual({ initialized: true, chamber: 'landing' });
  await page.getByRole('link', { name: 'Enter site', exact: true }).click();
  await expect(page.locator('#menu')).toBeVisible();
});
