/** Keep existing standalone work reachable when core scripts cannot load. */
(() => {
  window.etceter4Startup = window.etceter4Startup || {
    status: 'pending',
    route: null,
  };

  function showFallback() {
    if (document.getElementById('runtime-fallback')) {
      return;
    }
    const panel = document.createElement('section');
    panel.id = 'runtime-fallback';
    panel.className = 'fixed top-0 left-0 right-0 pa4 bg-white black z-999';
    panel.setAttribute('role', 'alert');
    // Recovery remains readable even when the application's CSS is unavailable.
    Object.assign(panel.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      overflow: 'auto',
      padding: '2rem',
      background: '#fff',
      color: '#111',
      fontFamily: 'sans-serif',
    });
    const title = document.createElement('h1');
    title.textContent = 'ETCETER4';
    const message = document.createElement('p');
    message.textContent =
      'The interactive site could not start. You can still open these works or reload to try again.';
    const links = document.createElement('nav');
    links.setAttribute('aria-label', 'Available works');
    for (const [label, href] of [
      ['OGOD', 'OGOD.html'],
      ['Text labyrinth', 'loophole.html'],
      ['Music on Bandcamp', 'https://etceter4.bandcamp.com'],
    ]) {
      const link = document.createElement('a');
      link.className = 'db mb3 blue';
      Object.assign(link.style, {
        display: 'block',
        marginBottom: '1rem',
        color: '#006',
      });
      link.textContent = label;
      link.href = href;
      links.appendChild(link);
    }
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = 'Reload site';
    reload.addEventListener('click', () => window.location.reload());
    panel.append(title, message, links, reload);
    document.body.appendChild(panel);
  }

  // A hung request/initializer must not leave the page blank forever. This is
  // recoverable: a later successful startup removes the panel automatically.
  const watchdog = window.setTimeout(() => {
    if (window.etceter4Startup.status !== 'ready') {
      showFallback();
    }
  }, 30000);

  function observeStartup() {
    const { status } = window.etceter4Startup;
    if (status === 'ready') {
      window.clearTimeout(watchdog);
      document.getElementById('runtime-fallback')?.remove();
    } else if (status === 'failed') {
      window.clearTimeout(watchdog);
      showFallback();
    }
  }
  window.addEventListener('etceter4:startup', observeStartup);
  document.addEventListener('DOMContentLoaded', () => {
    if (window.etceter4Startup.status === 'pending') {
      // Deferred scripts have completed, but main.js never entered startup.
      window.clearTimeout(watchdog);
      showFallback();
    } else {
      observeStartup();
    }
  });
  observeStartup();
})();
