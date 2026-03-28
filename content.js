(function () {
  const STORAGE_KEY = 'minDurationMinutes';
  const STORAGE_KEY_MODE = 'filterMode';
  const DEFAULT_THRESHOLD_MIN = 5;
  const DEFAULT_MODE = 'collapse';
  const FEED_SELECTOR = '#content .lazyLoadingList';
  const TRACK_SELECTOR = '.soundList__item';
  const MAX_RETRIES = 3;
  const RETRY_INTERVAL_MS = 500;

  const durationMap = new Map(); // permalink path (string) → durationMs
  let thresholdMs = DEFAULT_THRESHOLD_MIN * 60_000;
  let filterMode = DEFAULT_MODE;
  let activeObserver = null;

  // Load persisted threshold and mode on startup
  chrome.storage.local.get([STORAGE_KEY, STORAGE_KEY_MODE], (result) => {
    thresholdMs = (result[STORAGE_KEY] ?? DEFAULT_THRESHOLD_MIN) * 60_000;
    filterMode = result[STORAGE_KEY_MODE] ?? DEFAULT_MODE;
    applyFilterToAll();
  });

  // Re-filter when user moves the slider or changes mode (widget.js writes to storage)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      thresholdMs = changes[STORAGE_KEY].newValue * 60_000;
    }
    if (changes[STORAGE_KEY_MODE]) {
      filterMode = changes[STORAGE_KEY_MODE].newValue;
    }
    if (changes[STORAGE_KEY] || changes[STORAGE_KEY_MODE]) {
      applyFilterToAll();
    }
  });

  // Receive duration map from interceptor.js (PAGE world → isolated world via postMessage)
  window.addEventListener('message', (event) => {
    // Only accept messages from this page, with the expected type
    if (event.source !== window) return;
    if (event.data?.type !== 'SCF_DURATION_MAP') return;
    for (const [id, ms] of Object.entries(event.data.data)) {
      durationMap.set(id, ms);
    }
    applyFilterToAll();
  });

  // Watch for new track nodes in the feed (infinite scroll)
  function setupObserver(retriesLeft) {
    const container = document.querySelector(FEED_SELECTOR);
    if (!container) {
      if (retriesLeft > 0) {
        setTimeout(() => setupObserver(retriesLeft - 1), RETRY_INTERVAL_MS);
      } else {
        console.warn('scf: feed container not found after retries');
      }
      return;
    }

    activeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches(TRACK_SELECTOR)) {
            filterNode(node);
          } else {
            node.querySelectorAll(TRACK_SELECTOR).forEach(filterNode);
          }
        }
      }
      updateCount();
    });

    activeObserver.observe(container, { childList: true, subtree: true });
    applyFilterToAll();
  }

  function filterNode(node) {
    const permalink = getTrackPermalink(node);
    if (permalink == null) return;
    // applyFilter is defined in filter.js, which is loaded before content.js (see manifest.json)
    applyFilter(node, durationMap.get(permalink), thresholdMs, filterMode);
  }

  function applyFilterToAll() {
    document.querySelectorAll(TRACK_SELECTOR).forEach(filterNode);
    updateCount();
  }

  function getTrackPermalink(node) {
    const href = node.querySelector('a.soundTitle__title')?.getAttribute('href');
    if (!href) return null;
    try {
      return new URL(href, 'https://soundcloud.com').pathname;
    } catch {
      return null;
    }
  }

  function updateCount() {
    const count = document.querySelectorAll('.scf-collapsed, .scf-removed').length;
    window.dispatchEvent(new CustomEvent('scf:count', { detail: { count } }));
  }

  setupObserver(MAX_RETRIES);

  // Disconnect observer when navigating away from /feed (SoundCloud is an SPA)
  window.navigation?.addEventListener('navigate', (event) => {
    if (!event.destination.url.includes('/feed')) {
      activeObserver?.disconnect();
      activeObserver = null;
    }
  });
})();
