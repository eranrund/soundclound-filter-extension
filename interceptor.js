// Runs in PAGE world (MAIN) — has access to page's window.fetch
// Must be injected at document_start (before SoundCloud's own scripts run)
(function () {
  if (typeof window.fetch !== 'function') return;

  const MSG_TYPE = 'SCF_DURATION_MAP';
  const API_REGEX = /\/\/api-v2\.soundcloud\.com\/stream(\?|$)/;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
    if (API_REGEX.test(url)) {
      // Clone so we don't consume the response body
      response.clone().json().then((json) => {
        const map = extractDurationMap(json);
        if (Object.keys(map).length > 0) {
          window.postMessage({ type: MSG_TYPE, data: map }, window.location.origin);
        }
      }).catch(() => {
        // Ignore parse errors — non-JSON or unexpected structure
      });
    }

    return response;
  };

  function extractDurationMap(json) {
    const map = {};
    const collection = json?.collection ?? [];
    for (const item of collection) {
      // SoundCloud wraps tracks as: { type: 'track', track: { id, duration, ... } }
      const track = item?.track ?? (item?.type === 'track' ? item : null);
      if (track?.id != null && track?.duration != null) {
        map[track.id] = track.duration; // duration is in milliseconds
      }
    }
    return map;
  }
})();
