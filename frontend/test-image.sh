#!/bin/sh
# Builds this image and checks what it promises, in a throwaway container it removes afterwards:
# - it runs as a user other than root;
# - it serves the app under its base path on port 3000, and every page of it (an address the app routes,
#   like /catalogue, answers with the app, not a 404);
# - it serves the built app only (no sources, source maps or node_modules among the files nginx serves),
#   and ships no npm.
# Usage: sh frontend/test-image.sh
set -eu
cd "$(dirname "$0")"
TAG=catalogue-web-image-test:$$
NAME=catalogue-web-image-test-$$
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; docker rmi -f "$TAG" >/dev/null 2>&1 || true; }
trap cleanup EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

docker build -q -t "$TAG" --build-arg CATALOGUE_BASE=/project-catalogue/ . >/dev/null
user=$(docker run --rm --entrypoint id "$TAG" -u)
[ "$user" != 0 ] || fail "the image runs as root"

docker run -d --name "$NAME" "$TAG" >/dev/null
i=0
until docker exec "$NAME" wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 30 ] && fail "nothing answered on port 3000 in 30s"; sleep 1
done
for path in / /catalogue /metrics; do
  page=$(docker exec "$NAME" wget -qO- "http://127.0.0.1:3000$path") || fail "$path did not answer"
  echo "$page" | grep -q '<div id="root">' || fail "$path is not the app"
  echo "$page" | grep -q '/project-catalogue/assets/' || fail "$path does not load its assets under the base path"
done
# what nginx serves is the built app only: index.html, assets/, the files of public/ and nginx's own 50x.html
HTML=/usr/share/nginx/html
expected=$( (printf '%s\n' index.html assets 50x.html; ls public) | sort -u)
served=$(docker exec "$NAME" ls -A "$HTML" | sort)
[ "$served" = "$expected" ] || fail "$HTML holds $(echo $served), not $(echo $expected)"
sources=$(docker exec "$NAME" find "$HTML" -name src -o -name node_modules -o -name '*.ts' -o -name '*.tsx' -o -name '*.map')
[ -z "$sources" ] || fail "the image serves sources: $(echo $sources)"
docker exec "$NAME" sh -c 'command -v npm' >/dev/null 2>&1 && fail "the image ships npm"
echo "frontend image: all checks passed"
