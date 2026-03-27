import { strict as assert } from 'assert';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Evaluate filter.js inside a jsdom window and return { applyFilter }
function loadFilter(dom) {
  const src = readFileSync(join(__dirname, '../filter.js'), 'utf8');
  // Use the jsdom window's Function so DOM globals (classList, dataset, etc.) resolve correctly
  const factory = new dom.window.Function(src + '\n; return { applyFilter };');
  return factory();
}

function makeTrackElement(dom, artist = 'Artist', title = 'Track Title') {
  const el = dom.window.document.createElement('li');
  el.className = 'soundList__item';
  el.innerHTML = `
    <article>
      <a class="soundTitle__username">${artist}</a>
      <a class="soundTitle__title">${title}</a>
      <span class="sc-duration">3:42</span>
    </article>
  `;
  return el;
}

test('collapses a short track', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);

  applyFilter(el, 60_000, 300_000); // 1 min track, 5 min threshold

  assert.ok(el.classList.contains('scf-collapsed'), 'element should have scf-collapsed class');
  assert.ok(el.querySelector('.scf-placeholder'), 'placeholder should be injected');
  assert.ok(el.dataset.scfOriginal, 'original HTML should be saved in dataset');
});

test('placeholder shows artist name and title', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom, 'Bonobo', 'Kong');

  applyFilter(el, 60_000, 300_000);

  assert.ok(el.innerHTML.includes('Bonobo'), 'placeholder should include artist name');
  assert.ok(el.innerHTML.includes('Kong'), 'placeholder should include track title');
});

test('does not collapse a long track', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);

  applyFilter(el, 600_000, 300_000); // 10 min track, 5 min threshold

  assert.ok(!el.classList.contains('scf-collapsed'), 'long track should not be collapsed');
});

test('restores a previously collapsed track when threshold is lowered', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);
  const originalHTML = el.innerHTML;

  applyFilter(el, 60_000, 300_000); // collapse
  applyFilter(el, 60_000, 30_000);  // restore (threshold now 30s)

  assert.ok(!el.classList.contains('scf-collapsed'), 'element should not be collapsed after restore');
  assert.equal(el.innerHTML, originalHTML, 'original HTML should be fully restored');
});

test('fails open when durationMs is undefined', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);

  applyFilter(el, undefined, 300_000);

  assert.ok(!el.classList.contains('scf-collapsed'), 'unknown-duration track should not be collapsed');
});

test('does not re-collapse a user-revealed track (scf-shown)', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);

  applyFilter(el, 60_000, 300_000); // collapse
  el.classList.add('scf-shown');    // simulate user clicking "show"
  applyFilter(el, 60_000, 300_000); // re-apply filter

  assert.ok(!el.classList.contains('scf-collapsed'), 'user-revealed track should not be re-collapsed');
});

test('show-button click restores element and adds scf-shown class', () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>');
  const { applyFilter } = loadFilter(dom);
  const el = makeTrackElement(dom);
  const originalHTML = el.innerHTML;

  applyFilter(el, 60_000, 300_000); // collapse the track
  const btn = el.querySelector('.scf-show-btn');
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.ok(!el.classList.contains('scf-collapsed'), 'element should not have scf-collapsed class after click');
  assert.ok(el.classList.contains('scf-shown'), 'element should have scf-shown class after click');
  assert.ok(!el.querySelector('.scf-placeholder'), 'placeholder should be removed from innerHTML');
  assert.equal(el.innerHTML, originalHTML, 'original HTML should be fully restored');
});
