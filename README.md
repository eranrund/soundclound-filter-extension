# SoundCloud Feed Filter

> **Disclaimer:** This was 100% vibe coded. The code may or may not be of any acceptable quality. It works on my machine. Proceed accordingly.

A Chrome extension that filters your SoundCloud feed to hide short tracks below a minimum duration you set.

## What it does

Adds a floating control widget to your SoundCloud feed that lets you:

- Set a minimum track duration (1–60 minutes) via a slider
- Choose between **Collapse** (replaces short tracks with a slim placeholder) or **Remove** (hides them entirely) modes
- Optionally hide playlists
- Click "show" on any collapsed track to permanently reveal it for the session
- Drag the widget wherever you want — position is remembered

Settings persist across page reloads.

## Installation

This isn't on the Chrome Web Store. Load it manually:

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the repo folder
5. Navigate to `soundcloud.com/feed`

## How it works (the interesting bit)

SoundCloud's feed is a Backbone.js SPA that fetches track data via its own API calls. The extension uses a two-world architecture:

- **`interceptor.js`** runs in the PAGE world at `document_start`, intercepting `fetch` and `XHR` calls before SoundCloud's own code runs, extracting track duration data
- **`content.js`** receives that data via `postMessage`, then uses a `MutationObserver` to watch for new tracks as you scroll and applies the filter

Track state is tracked by permalink path, original DOM nodes are preserved when collapsing (just hidden), and the filter fails open — if duration data isn't available for a track, it stays visible.

## Files

```
manifest.json        Chrome MV3 manifest
interceptor.js       PAGE-world fetch/XHR interceptor
content.js           Content script, MutationObserver, filter orchestration
filter.js            Core collapse/restore/remove logic
widget.js            Floating control widget + drag persistence
widget.css           Widget and placeholder styles
tests/               Unit tests (Node + JSDOM)
```

## Development

Run tests:

```bash
node --test tests/filter.test.js
```

## Known issues / caveats

- Only works on `soundcloud.com/feed`
- SoundCloud can change their API or DOM structure at any time and break this entirely
- The code quality is whatever it is — it was vibe coded, remember?

## License

MIT. Use it, break it, fix it, ignore it.
