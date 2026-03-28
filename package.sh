#!/bin/bash
set -euo pipefail

VERSION=$(node -p "require('./manifest.json').version")
OUT="soundcloud-feed-filter-v${VERSION}.zip"

rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  filter.js \
  content.js \
  interceptor.js \
  widget.js \
  widget.css \
  icons/ \
  --exclude "*.DS_Store"

echo "Created $OUT ($(du -sh "$OUT" | cut -f1))"
