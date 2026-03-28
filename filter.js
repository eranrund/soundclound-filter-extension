function applyFilter(element, durationMs, thresholdMs, mode) {
  if (mode === undefined) mode = 'collapse';

  // User explicitly revealed this track — restore any filtered state and leave it alone
  if (element.classList.contains('scf-shown')) {
    _restoreCollapsed(element);
    _restoreRemoved(element);
    return;
  }

  // Fail open: never hide a track without a confirmed duration; "off" mode disables filtering
  const shouldFilter = durationMs != null && durationMs < thresholdMs && mode !== 'off';

  const isCollapsed = element.classList.contains('scf-collapsed');
  const isRemoved = element.classList.contains('scf-removed');

  // Restore from a stale filter state (mode changed or track no longer under threshold)
  if (isCollapsed && (mode !== 'collapse' || !shouldFilter)) {
    _restoreCollapsed(element);
  }
  if (isRemoved && (mode !== 'remove' || !shouldFilter)) {
    _restoreRemoved(element);
  }

  if (!shouldFilter) return;

  if (mode === 'collapse' && !element.classList.contains('scf-collapsed')) {
    _collapse(element, durationMs);
  } else if (mode === 'remove' && !element.classList.contains('scf-removed')) {
    element.style.display = 'none';
    element.classList.add('scf-removed');
  }
}

function _collapse(element, durationMs) {
  // Read metadata BEFORE hiding — selectors still work on visible DOM
  const artistEl = element.querySelector('.soundTitle__username');
  const titleEl = element.querySelector('.soundTitle__title');
  const durationEl = element.querySelector('.sc-duration');
  const artist = artistEl ? artistEl.textContent.trim() : 'Unknown';
  const title = titleEl ? titleEl.textContent.trim() : 'Unknown';
  const duration = durationEl ? durationEl.textContent.trim() : formatDuration(durationMs);

  // Hide original children in-place (preserves canvas pixels and JS state)
  for (const child of element.children) {
    child.style.display = 'none';
  }

  // Append placeholder as a sibling to the hidden originals
  const placeholder = document.createElement('div');
  placeholder.className = 'scf-placeholder';
  placeholder.innerHTML = `
    <span class="scf-info">
      <span class="scf-play-icon">▶</span>
      <span class="scf-meta">${escapeHtml(artist)} — ${escapeHtml(title)}</span>
      <span class="scf-duration">${escapeHtml(duration)}</span>
    </span>
    <button class="scf-show-btn" type="button">show</button>
  `;
  element.appendChild(placeholder);
  element.classList.add('scf-collapsed');

  placeholder.querySelector('.scf-show-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    _restoreCollapsed(element);
    element.classList.add('scf-shown');
  });
}

function _restoreCollapsed(element) {
  if (!element.classList.contains('scf-collapsed')) return;
  element.querySelector('.scf-placeholder')?.remove();
  for (const child of element.children) {
    child.style.display = '';
  }
  element.classList.remove('scf-collapsed');
}

function _restoreRemoved(element) {
  if (!element.classList.contains('scf-removed')) return;
  element.style.display = '';
  element.classList.remove('scf-removed');
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
