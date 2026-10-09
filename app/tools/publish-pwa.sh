#!/usr/bin/env bash
# Builds the web app and publishes it as a PWA to GitHub Pages:
# https://kurtkurtkurt-del.github.io/afterhours-pwa/
# Run from app/: tools/publish-pwa.sh   (REPO=... BASE=... to publish elsewhere)
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${REPO:-https://github.com/kurtkurtkurt-del/afterhours-pwa.git}"
BASE="${BASE:-/afterhours-pwa}"

rm -rf dist
PWA_BASE="$BASE" npx expo export -p web
# public/index.html links the manifest and icon from the root; move them under the base.
sed -i.bak "s#href=\"/manifest.json\"#href=\"$BASE/manifest.json\"#; s#href=\"/apple-touch-icon.png\"#href=\"$BASE/apple-touch-icon.png\"#" dist/index.html
rm dist/index.html.bak
# GitHub Pages serves 404.html for unknown paths: deep links open the app.
cp dist/index.html dist/404.html
touch dist/.nojekyll

TMP="$(mktemp -d)"
cp -R dist/. "$TMP"
cd "$TMP"
git init -q -b main
git add -A
git commit -qm "PWA build $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f "$REPO" main
echo "Published: $BASE"
