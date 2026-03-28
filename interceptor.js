// Runs in PAGE world (MAIN) — has access to page's window.fetch and XMLHttpRequest
// Must be injected at document_start (before SoundCloud's own scripts run)
(function () {
  const MSG_TYPE = 'SCF_DURATION_MAP';
  const API_REGEX = /\/\/api-v2\.soundcloud\.com\/stream\b/;

  function handleResponseText(url, text) {
    if (!API_REGEX.test(url)) return;
    try {
      const json = JSON.parse(text);
      const map = extractDurationMap(json);
      if (Object.keys(map).length > 0) {
        window.postMessage({ type: MSG_TYPE, data: map }, window.location.origin);
      }
    } catch {
      // ignore parse errors
    }
  }

  // Intercept fetch
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      if (API_REGEX.test(url)) {
        response.clone().text().then((text) => handleResponseText(url, text)).catch(() => {});
      }
      return response;
    };
  }

  // Intercept XMLHttpRequest (used by SoundCloud's Backbone.js layer)
  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    let _url = '';

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url, ...rest) {
      _url = String(url);
      return originalOpen(method, url, ...rest);
    };

    xhr.addEventListener('load', function () {
      if (API_REGEX.test(_url)) {
        handleResponseText(_url, xhr.responseText);
      }
    });

    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  // Copy static properties (DONE, HEADERS_RECEIVED, etc.)
  Object.keys(OriginalXHR).forEach((k) => { try { PatchedXHR[k] = OriginalXHR[k]; } catch {} });
  window.XMLHttpRequest = PatchedXHR;

  function extractDurationMap(json) {
    const map = {};
    const collection = json?.collection ?? [];
    for (const item of collection) {
      // SoundCloud wraps tracks as: { type: 'track-repost'|'track', track: { duration, permalink_url, ... } }
      const track = item?.track ?? (item?.type === 'track' ? item : null);
      if (track?.duration != null && track?.permalink_url) {
        try {
          const key = new URL(track.permalink_url).pathname; // e.g. "/imzeropoint/rock-your-body-flip"
          map[key] = track.duration; // duration is in milliseconds
        } catch {
          // Skip if permalink_url is not a valid URL
        }
      }
    }
    return map;
  }
})();
