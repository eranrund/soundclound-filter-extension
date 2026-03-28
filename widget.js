(function () {
  const STORAGE_KEY_THRESHOLD = 'minDurationMinutes';
  const STORAGE_KEY_POSITION = 'widgetPosition';
  const STORAGE_KEY_MODE = 'filterMode';
  const DEFAULT_THRESHOLD = 5;
  const DEFAULT_MODE = 'collapse';

  const widget = document.createElement('div');
  widget.className = 'scf-widget';
  widget.id = 'scf-widget';
  widget.innerHTML = `
    <div class="scf-widget-header" id="scf-drag-handle">Filter: min length</div>
    <div class="scf-slider-row">
      <input type="range" class="scf-slider" id="scf-slider" min="1" max="60" value="${DEFAULT_THRESHOLD}">
      <span class="scf-value" id="scf-value">${DEFAULT_THRESHOLD}m</span>
    </div>
    <div class="scf-mode-row">
      <select class="scf-mode" id="scf-mode">
        <option value="collapse">Collapse</option>
        <option value="remove">Remove</option>
        <option value="off">Off</option>
      </select>
    </div>
    <div class="scf-count" id="scf-count"></div>
  `;
  const target = document.body ?? document.documentElement;
  target.appendChild(widget);

  const slider = document.getElementById('scf-slider');
  const valueLabel = document.getElementById('scf-value');
  const countLabel = document.getElementById('scf-count');
  const modeSelect = document.getElementById('scf-mode');

  // Load persisted threshold, mode, and position
  chrome.storage.local.get([STORAGE_KEY_THRESHOLD, STORAGE_KEY_MODE, STORAGE_KEY_POSITION], (result) => {
    const threshold = result[STORAGE_KEY_THRESHOLD] ?? DEFAULT_THRESHOLD;
    slider.value = threshold;
    valueLabel.textContent = `${threshold}m`;

    modeSelect.value = result[STORAGE_KEY_MODE] ?? DEFAULT_MODE;

    const pos = result[STORAGE_KEY_POSITION];
    if (pos) {
      widget.style.bottom = `${pos.bottom}px`;
      widget.style.right = `${pos.right}px`;
      widget.style.top = 'auto';
      widget.style.left = 'auto';
    }
  });

  // Persist threshold on slider change; content.js reacts via storage.onChanged
  slider.addEventListener('input', () => {
    const val = parseInt(slider.value, 10);
    valueLabel.textContent = `${val}m`;
    chrome.storage.local.set({ [STORAGE_KEY_THRESHOLD]: val });
  });

  // Persist mode on change; content.js reacts via storage.onChanged
  modeSelect.addEventListener('change', () => {
    chrome.storage.local.set({ [STORAGE_KEY_MODE]: modeSelect.value });
  });

  // Receive hidden track count from content.js
  window.addEventListener('scf:count', (e) => {
    const n = e.detail.count;
    countLabel.textContent = n > 0 ? `${n} track${n === 1 ? '' : 's'} hidden` : '';
  });

  // Dragging
  const handle = document.getElementById('scf-drag-handle');
  let dragging = false;
  let startX, startY, startRight, startBottom;
  let dragController = null;

  handle.addEventListener('mousedown', (e) => {
    // Abort any previous drag listeners
    if (dragController) dragController.abort();
    dragController = new AbortController();
    const signal = dragController.signal;

    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = widget.getBoundingClientRect();
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;
    e.preventDefault();

    document.addEventListener('mousemove', onMouseMove, { signal });
    document.addEventListener('mouseup', onMouseUp, { signal });
  });

  function onMouseMove(e) {
    if (!dragging) return;
    const dx = startX - e.clientX;
    const dy = startY - e.clientY;
    widget.style.right = `${Math.max(0, startRight + dx)}px`;
    widget.style.bottom = `${Math.max(0, startBottom + dy)}px`;
    widget.style.left = 'auto';
    widget.style.top = 'auto';
  }

  function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    if (dragController) {
      dragController.abort();
      dragController = null;
    }
    const rect = widget.getBoundingClientRect();
    chrome.storage.local.set({
      [STORAGE_KEY_POSITION]: {
        right: Math.round(window.innerWidth - rect.right),
        bottom: Math.round(window.innerHeight - rect.bottom),
      },
    });
  }
})();
