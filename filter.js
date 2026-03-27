function applyFilter(element, durationMs, thresholdMs) {
  // Fail open: never hide a track without a confirmed duration
  if (durationMs == null) return;

  // Don't re-collapse a track the user explicitly revealed
  if (element.classList.contains('scf-shown')) {
    // Clean up any collapsed state if present
    if (element.classList.contains('scf-collapsed')) {
      element.innerHTML = element.dataset.scfOriginal;
      element.classList.remove('scf-collapsed');
      delete element.dataset.scfOriginal;
    }
    return;
  }

  const shouldCollapse = durationMs < thresholdMs;
  const isCollapsed = element.classList.contains('scf-collapsed');

  if (shouldCollapse && !isCollapsed) {
    // Save original content before replacing
    element.dataset.scfOriginal = element.innerHTML;

    // Read metadata from original DOM before replacing it
    const artistEl = element.querySelector('.soundTitle__username');
    const titleEl = element.querySelector('.soundTitle__title');
    const durationEl = element.querySelector('.sc-duration');
    const artist = artistEl ? artistEl.textContent.trim() : 'Unknown';
    const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
    const duration = durationEl ? durationEl.textContent.trim() : formatDuration(durationMs);

    element.innerHTML = `
      <div class="scf-placeholder">
        <span class="scf-info">
          <span class="scf-play-icon">▶</span>
          <span class="scf-meta">${escapeHtml(artist)} — ${escapeHtml(title)}</span>
          <span class="scf-duration">${escapeHtml(duration)}</span>
        </span>
        <button class="scf-show-btn" type="button">show</button>
      </div>
    `;
    element.classList.add('scf-collapsed');

    // "Show" button: reveal track and prevent re-collapse
    element.querySelector('.scf-show-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      element.innerHTML = element.dataset.scfOriginal;
      element.classList.remove('scf-collapsed');
      element.classList.add('scf-shown');
      delete element.dataset.scfOriginal;
    });

  } else if (!shouldCollapse && isCollapsed) {
    // Restore original content when threshold drops below track duration
    element.innerHTML = element.dataset.scfOriginal;
    element.classList.remove('scf-collapsed');
    delete element.dataset.scfOriginal;
  }
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
