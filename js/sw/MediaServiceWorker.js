/**
 * @file MediaServiceWorker.js
 * @description Service worker entrypoint alias forwarding to js/media/cache/MediaServiceWorker.js.
 * Preserves namespace isolation and unified offline caching.
 */

'use strict';

// If in Node/CommonJS context, export from media/cache
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  module.exports = require('../media/cache/MediaServiceWorker.js');
}
