#!/bin/sh
# Builds this image and checks what it promises, in a throwaway container it removes afterwards:
# - it runs as a user other than root;
# - it serves the app under its base path on port 3000, and every page of it (an address the app routes,
#   like /catalogue, answers with the app, not a 404);
# - it ships the built app only: no sources, no node_modules, no npm.
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
for what in /app/src /app/node_modules; do
  docker exec "$NAME" sh -c "[ ! -e $what ]" || fail "the image ships $what"
done
docker exec "$NAME" sh -c 'command -v npm' >/dev/null 2>&1 && fail "the image ships npm"
echo "frontend image: all checks passed"
