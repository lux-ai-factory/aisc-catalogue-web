#!/bin/sh
# Builds this image and checks that the plugin index is immutable, in throwaway containers (own names, own
# volume, no published port) that it removes afterwards:
# - a new root/public is created non-volatile;
# - a second upload of a version already on the index, with other bytes, is refused and the first file stays;
# - a volume whose root/public was made volatile is made non-volatile at the next start, saying so in one line.
# Every check runs; the script ends with the list of those that failed.
# Usage: sh devpi/test-index-immutable.sh
set -eu

TAG=catalogue-devpi-immutable:$$
NAME=catalogue-devpi-immutable-$$
VOL=catalogue-devpi-immutable-$$
NET=catalogue-devpi-immutable-$$
PW="pw-$$-throwaway"
FAILED=""
fail() { echo "FAIL: $*" >&2; FAILED="$FAILED
- $*"; }
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker image rm "$TAG" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -q -t "$TAG" "$(dirname "$0")" >/dev/null
docker network create "$NET" >/dev/null

start() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  DEVPI_ROOT_PASSWORD="$PW" DEVPI_INDEX=root/public \
    docker run -d --name "$NAME" --network "$NET" -v "$VOL:/data" -e DEVPI_ROOT_PASSWORD -e DEVPI_INDEX "$TAG" >/dev/null
  i=0
  until docker logs "$NAME" 2>&1 | grep -q "devpi ready"; do
    i=$((i + 1))
    [ "$i" -gt 90 ] && return 1
    [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ] || return 1
    sleep 1
  done
}
volatile() { docker exec "$NAME" curl -sf -H "Accept: application/json" "http://127.0.0.1:3141/root/public" \
  | grep -o '"volatile": *[a-z]*' | grep -o '[a-z]*$'; }
# upload <body>: tiny-0.1 as an sdist whose PKG-INFO carries <body>, uploaded as root; fails when refused
upload() {
  docker exec "$NAME" sh -c "cd /tmp && rm -rf tiny-0.1 tiny-0.1.tar.gz && mkdir tiny-0.1 \
    && printf 'Metadata-Version: 1.0\nName: tiny\nVersion: 0.1\nSummary: $1\n' > tiny-0.1/PKG-INFO \
    && tar czf tiny-0.1.tar.gz tiny-0.1 && devpi use http://127.0.0.1:3141/root/public >/dev/null \
    && devpi login root --password '$PW' >/dev/null && devpi upload tiny-0.1.tar.gz >/dev/null 2>&1"
}
served_sha256() { docker exec "$NAME" curl -sf "http://127.0.0.1:3141/root/public/+simple/tiny/" \
  | grep -o 'tiny-0.1.tar.gz#sha256=[0-9a-f]*' | head -1; }

start || { echo "FAIL: did not start" >&2; exit 1; }
[ "$(volatile)" = false ] || fail "a new root/public is volatile ($(volatile))"

upload first || fail "the first upload of tiny 0.1 was refused"
before=$(served_sha256)
if upload other; then
  fail "a second upload of tiny 0.1 with other bytes was accepted"
fi
[ "$(served_sha256)" = "$before" ] || fail "the file the index serves for tiny 0.1 changed"

# a volume an earlier image left with a volatile index
docker exec "$NAME" sh -c "devpi use http://127.0.0.1:3141/root/public >/dev/null \
  && devpi login root --password '$PW' >/dev/null && devpi index root/public volatile=True >/dev/null"
start || { echo "FAIL: did not restart" >&2; exit 1; }
[ "$(volatile)" = false ] || fail "a volatile root/public stays volatile after a restart"
docker logs "$NAME" 2>&1 | grep -q "devpi: index root/public made non-volatile" \
  || fail "the start does not say it made root/public non-volatile"

if [ -n "$FAILED" ]; then
  printf 'FAILED:%s\n' "$FAILED" >&2
  exit 1
fi
echo "OK: the index is immutable"
