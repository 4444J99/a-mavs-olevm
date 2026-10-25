/**
 * @file main.js
 * @description Main application entry point for etceter4.com
 * Handles document ready initialization, page routing based on URL hash,
 * and provides polyfills for older browser compatibility.
 *
 * @requires jQuery
 * @requires page.js - Page navigation and management system
 * @requires pageData.js - Page configuration and data
 *
 * @global {Object} currentPage - The currently active page object (from page.js)
 *
 * Considering following the idiomatic style guide
 * https://www.npmjs.com/package/eslint-config-idiomatic
 * https://github.com/rwaldron/idiomatic.js
 */

/**
 * Document ready handler - Application initialization
 * @listens document#ready
 *
 * Flow:
 * 1. Check for hash in URL (e.g., #landing, #diary, #stills)
 * 2. If hash exists, show that section and initialize it
 * 3. If no hash, default to showing the landing page
 * 4. Sets the global currentPage variable to track active page
 */

/**
 * Global error boundary
 * Catches unhandled errors and promise rejections to prevent silent failures
 */
window.onerror = (msg, src, line, col, err) => {
  console.error(`Global error: ${msg} at ${src}:${line}:${col}`, err);
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled promise rejection:', e.reason);
});

/**
 * Flag to prevent hashchange handler during programmatic navigation
 * Reassigned in page.js during navigation
 * @type {boolean}
 */
// eslint-disable-next-line prefer-const
let isNavigating = false;

/**
 * Handles browser back/forward navigation via hashchange event
 * @listens window#hashchange
 */
function handleHashChange() {
  if (isNavigating) {
    return;
  }

  const hash = window.location.hash || '#landing';

  // showNewSection decides whether the route is settled. During an outgoing
  // fade, the old page can still be current even though a new route is pending.
  // A back/forward event must therefore reach its latest-request queue.
  try {
    const targetPage = Page.findPage(hash);
    if (targetPage) {
      showNewSection(hash);
    }
  } catch (error) {
    // If page not found, navigate to landing
    console.warn(`Page not found: ${hash}, navigating to landing`);
    window.location.hash = '#landing';
  }
}

// Listen for browser back/forward navigation
window.addEventListener('hashchange', handleHashChange);

/**
 * Register Service Workers for PWA support and media caching
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main PWA service worker
    navigator.serviceWorker
      .register('./sw.js')
      .then(registration => {
        console.log('SW registered:', registration.scope);
        // Check for updates periodically
        setInterval(() => {
          registration.update().catch(error => {
            console.warn('SW update check failed:', error);
          });
        }, 60000); // Check every 60 seconds
      })
      .catch(error => {
        console.warn('SW registration failed:', error);
      });

    // Register MediaServiceWorker for offline media caching
    navigator.serviceWorker
      .register('./js/media/cache/MediaServiceWorker.js')
      .then(registration => {
        console.log('MediaServiceWorker registered:', registration.scope);
        // Check for updates periodically
        setInterval(() => {
          registration.update().catch(error => {
            console.warn('MediaServiceWorker update check failed:', error);
          });
        }, 60000); // Check every 60 seconds
      })
      .catch(error => {
        console.warn('MediaServiceWorker registration failed:', error);
      });
  });
}

/**
 * Manage LandingCompositor lifecycle during page navigation
 * Pauses compositor when leaving #landing, resumes when returning
 */
function manageLandingCompositor() {
  // Check if compositor exists
  if (!window.landingCompositor) {
    return;
  }

  const isOnLanding = currentPage && currentPage.id === '#landing';

  if (isOnLanding && !window.landingCompositor.isRunning) {
    // Resume compositor when returning to landing
    window.landingCompositor.start();
  } else if (!isOnLanding && window.landingCompositor.isRunning) {
    // Pause compositor when leaving landing
    window.landingCompositor.stop();
  }
}

/**
 * Cmd/Ctrl+K search bootstrap
 * Loads discovery scripts on first use, then delegates to DiscoveryController
 */
let searchBootstrapPromise = null;
document.addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') {
    return;
  }
  e.preventDefault();
  if (searchBootstrapPromise) {
    return;
  }
  searchBootstrapPromise = Promise.resolve()
    .then(async () => {
      if (typeof DiscoveryController === 'undefined') {
        await ChamberLoader.getInstance().ensureLoaded('discovery');
      }
      const controller = DiscoveryController.getInstance();
      await controller.initialize();
      controller.openSearchModal();
    })
    .catch(error => {
      recoverNavigation(error, currentPage, '#discovery');
    })
    .finally(() => {
      searchBootstrapPromise = null;
    });
});

/** Report actual startup completion rather than the presence of partial globals. */
function reportApplicationStartup(status, route = null) {
  window.etceter4Startup = { status, route };
  window.dispatchEvent(
    new CustomEvent('etceter4:startup', { detail: window.etceter4Startup })
  );
}

/** Finish every visible startup route, including a recovered initial deep link. */
function finishApplicationStartup(pageId) {
  try {
    manageLandingCompositor();
  } catch (error) {
    console.warn('Landing compositor initialization error:', error.message);
  }
  if (typeof initializeLivingPantheon === 'function') {
    try {
      initializeLivingPantheon(pageId);
    } catch (error) {
      console.warn('Living Pantheon initialization error:', error.message);
    }
  }
  reportApplicationStartup('ready', pageId);
}

function failApplicationStartup(error) {
  console.error('Application startup failed:', error);
  reportApplicationStartup('failed');
}

reportApplicationStartup('starting');
try {
  $(document).ready(() => {
    // A promise boundary catches synchronous setup errors as well as rejected
    // chamber loads. Missing Page data must reach the independent fallback.
    Promise.resolve()
      .then(() => {
        const hash = window.location.hash;
        if (hash) {
          let target;
          let element;
          try {
            element = $(hash);
            target = Page.findPage(hash);
          } catch (_error) {
            console.warn(
              `Invalid hash on load: ${hash}, defaulting to landing`
            );
            currentPage = Page.findPage('#landing');
            $('#landing').removeClass('dn');
            window.location.hash = '#landing';
            finishApplicationStartup('#landing');
            return;
          }
          currentPage = target;
          return Promise.resolve()
            .then(() => target.initPage())
            .then(() => {
              element.removeClass('dn');
              if (hash === '#stills' || hash === '#diary') {
                element.addClass('dt');
              }
              finishApplicationStartup(hash);
            })
            .catch(error => {
              recoverNavigation(error, Page.findPage('#landing'), hash);
              finishApplicationStartup('#landing');
            });
        }
        currentPage = Page.findPage('#landing');
        $('#landing').removeClass('dn');
        finishApplicationStartup('#landing');
      })
      .catch(failApplicationStartup);
  });
} catch (error) {
  // jQuery itself may have failed before its ready handler could be registered.
  failApplicationStartup(error);
}
