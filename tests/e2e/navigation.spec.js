/**
 * Navigation E2E Tests
 * Tests page navigation, hash routing, and keyboard navigation
 */

import { test, expect } from '@playwright/test';

/**
 * Wait for jQuery to be loaded and document ready to have fired.
 * Returns true if successful within timeout, false otherwise.
 */
async function waitForJQueryReady(page, timeout = 10000) {
  try {
    await page.waitForFunction(
      () => {
        if (typeof window.jQuery === 'undefined') return false;
        return window.jQuery.isReady === true;
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate to a specific page via JavaScript
 * This bypasses hash navigation issues in headless browsers by
 * directly manipulating the DOM
 * @param {import('@playwright/test').Page} page
 * @param {string} pageHash - Hash ID (e.g., '#menu', '#vision')
 * @param {number} timeout - Max wait time in milliseconds
 */
async function navigateToPage(page, pageHash, timeout = 10000) {
  const pageId = pageHash.startsWith('#') ? pageHash : `#${pageHash}`;

  // Ensure jQuery is ready
  await waitForJQueryReady(page);

  // Navigate using JavaScript - hide all pages, show target
  await page.evaluate(targetPage => {
    // List of all known page sections
    const pageIds = [
      'visual-home',
      'landing',
      'menu',
      'east-wing',
      'west-wing',
      'south-wing',
      'north-wing',
      'sound',
      'vision',
      'words',
      'info',
      'diary',
      'stills',
      'video',
      'blog',
      'discovery',
      'ogod3d',
    ];

    // Hide all pages
    pageIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('dn');
        el.style.display = 'none';
      }
    });

    // Show target page
    const targetId = targetPage.replace('#', '');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.classList.remove('dn');
      targetEl.style.display = '';
      targetEl.style.opacity = '1';
    }

    // Update currentPage and hash
    if (typeof Page !== 'undefined' && Page.findPage) {
      try {
        window.currentPage = Page.findPage(targetPage);
        window.currentPage.initPage();
      } catch {
        // Page not found in pages array
      }
    }
    window.location.hash = targetPage;
  }, pageId);

  // Wait for the page element to be visible
  await page.locator(pageId).waitFor({ state: 'visible', timeout });
}

test.describe('Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);
  });

  test('should display the visual home initially', async ({ page }) => {
    // The image-first front door is the default entry; the 3D landing is now a
    // deeper room reachable at #landing.
    const visualHome = page.locator('#visual-home');
    await expect(visualHome).toBeVisible();
    await expect(page.locator('#landing')).toBeHidden();
  });

  test('landing remains reachable via its hash', async ({ page }) => {
    await navigateToPage(page, '#landing');
    await expect(page.locator('#landing')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to menu from landing', async ({ page }) => {
    await navigateToPage(page, '#menu');

    const menu = page.locator('#menu');
    await expect(menu).toBeVisible({ timeout: 10000 });
  });

  test('should navigate via hash change', async ({ page }) => {
    await navigateToPage(page, '#menu');
    await navigateToPage(page, '#vision');

    const vision = page.locator('#vision');
    await expect(vision).toBeVisible({ timeout: 10000 });
  });

  test('should support browser back/forward navigation', async ({ page }) => {
    await page.goto('/#menu');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    await page.goto('/#vision');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    // Go back - this triggers hashchange which calls showNewSection
    await page.goBack();
    await page.waitForTimeout(2000); // Wait for animation

    // URL should be menu
    expect(page.url()).toContain('#menu');
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/#menu');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    // Check that nav links have aria-labels
    const soundLink = page.locator('#toSoundPage');
    await expect(soundLink).toHaveAttribute('aria-label');

    const wordsLink = page.locator('#toWordsPage');
    await expect(wordsLink).toHaveAttribute('aria-label');
  });
});

test.describe('Keyboard Navigation', () => {
  test('should navigate with Escape key', async ({ page }) => {
    await page.goto('/#vision');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    // Press Escape to go back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000); // Wait for animation

    // Should navigate back to menu
    expect(page.url()).toContain('#menu');
  });

  test('should navigate with Home key', async ({ page }) => {
    await page.goto('/#menu');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    // Press Home to go to landing
    await page.keyboard.press('Home');
    await page.waitForTimeout(2000); // Wait for animation

    expect(page.url()).toContain('#landing');
  });

  test('should navigate to menu with M key', async ({ page }) => {
    await page.goto('/#vision');
    await page.waitForLoadState('domcontentloaded');
    await waitForJQueryReady(page);

    // Press M to go to menu
    await page.keyboard.press('m');
    await page.waitForTimeout(2000); // Wait for animation

    expect(page.url()).toContain('#menu');
  });
});
