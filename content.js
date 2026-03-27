(function () {
  const STORAGE_KEY = 'minDurationMinutes';
  const DEFAULT_THRESHOLD_MIN = 5;
  const FEED_SELECTOR = '#content .lazyLoadingList';
  const TRACK_SELECTOR = '.soundList__item';
  const MAX_RETRIES = 3;
  const RETRY_INTERVAL_MS = 500;

  const durationMap = new Map(); // trackId (number) → durationMs
  let thresholdMs = DEFAULT_THRESHOLD_MIN * 60_000;

  // Load persisted threshold on startup
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    thresholdMs = (result[STORAGE_KEY] ?? DEFAULT_THRESHOLD_MIN) * 60_000;
    applyFilterToAll();
  });

  // Re-filter when user moves the slider (widget.js writes to storage)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      thresholdMs = changes[STORAGE_KEY].newValue * 60_000;
      applyFilterToAll();
    }
  });

  // Receive duration map from interceptor.js (PAGE world → isolated world via postMessage)
  window.addEventListener('message', (event) => {
    // Only accept messages from this page, with the expected type
    if (event.source !== window) return;
    if (event.data?.type !== 'SCF_DURATION_MAP') return;
    for (const [id, ms] of Object.entries(event.data.data)) {
      durationMap.set(Number(id), ms);
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

    const observer = new MutationObserver((mutations) => {
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

    observer.observe(container, { childList: true, subtree: true });
    applyFilterToAll();
  }

  function filterNode(node) {
    const trackId = getTrackId(node);
    if (trackId == null) return;
    applyFilter(node, durationMap.get(trackId), thresholdMs);
  }

  function applyFilterToAll() {
    document.querySelectorAll(TRACK_SELECTOR).forEach(filterNode);
    updateCount();
  }

  function getTrackId(node) {
    // data-sc-item-id on the list item, or data-item-id on the inner article
    const raw = node.dataset.scItemId ?? node.querySelector('article')?.dataset.itemId;
    return raw != null ? Number(raw) : null;
  }

  function updateCount() {
    const count = document.querySelectorAll('.scf-collapsed').length;
    window.dispatchEvent(new CustomEvent('scf:count', { detail: { count } }));
  }

  setupObserver(MAX_RETRIES);
})();
