import { test, expect } from '@playwright/test';

// A fresh document must load its own prerequisites. Visiting Stills beforehand
// used to hide the missing Carousel dependency in every other image-based room.
test.use({ serviceWorkers: 'block' });

test('a cold Odeion deep link loads its image prerequisites and visible content', async ({
  page,
}) => {
  const scriptRequests = [];
  const pageErrors = [];
  page.on('request', request => {
    if (request.resourceType() === 'script') {
      scriptRequests.push(new URL(request.url()).pathname);
    }
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/#odeion');
  await expect(page.locator('#odeion')).toBeVisible();
  await expect(page.locator('#odeion-player-container')).toBeVisible();
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveURL(/#odeion$/);
  const carousel = scriptRequests.indexOf('/js/modules/Carousel.js');
  const images = scriptRequests.indexOf('/js/images.js');
  expect(carousel).toBeGreaterThanOrEqual(0);
  expect(images).toBeGreaterThan(carousel);
  expect(
    await page.evaluate(() => ({
      carousel: typeof Carousel,
      imageHelper: typeof replacePlaceholders,
    }))
  ).toEqual({ carousel: 'function', imageHelper: 'function' });
  expect(
    pageErrors.filter(message => /Carousel|replacePlaceholders/.test(message))
  ).toEqual([]);
});
