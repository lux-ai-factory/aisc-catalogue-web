#!/bin/sh
# Builds this image and checks what entrypoint.sh promises, in throwaway containers (own names, own
# volume, no published port) that it removes afterwards:
# - root/public exists after the first start and after a restart on the same data;
# - with DEVPI_ROOT_PASSWORD, root opens with it and no longer with the empty password, also after a
#   restart; a restart with a different one stops with a message;
# - without it, it does not start: root would be open to anyone who reaches the port (a message says so,
#   on a new volume and on one whose root has a password);
# - the password is never on a command line (any user of the Docker host can read those with ps), and
#   root does not answer to the empty password from another container while the first start sets it;
# - an index that cannot be created stops the start: no "devpi ready"; so does an index of another
#   user than root (DEVPI_INDEX=team/dev), which would be created as root/dev;
# - docker stop reaches devpi-server (SIGTERM, not a SIGKILL after the grace period), and a server that
#   exits at once stops the start at once, not after the 60 s readiness wait.
# Usage: sh devpi/test-entrypoint.sh
set -eu

TAG=catalogue-devpi-test:$$
NAME=catalogue-devpi-test-$$
VOL=catalogue-devpi-test-$$
NET=catalogue-devpi-test-$$
PROBE=catalogue-devpi-probe-$$
WORK=$(mktemp -d)
fail() { echo "FAIL: $*" >&2; exit 1; }
cleanup() {
  [ -n "${SAMPLER:-}" ] && kill "$SAMPLER" 2>/dev/null || true
  docker rm -f "$NAME" "$PROBE" >/dev/null 2>&1 || true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker image rm "$TAG" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker build -q -t "$TAG" "$(dirname "$0")" >/dev/null
docker network create "$NET" >/dev/null

# Every process's command line on this host, read until the file $WORK/stop exists; a hit on the
# password (grep reads it from a file, so it is in no command line of ours) leaves $WORK/argv-hit.
sample_argv() {
  while [ ! -e "$WORK/stop" ]; do
    cat /proc/[0-9]*/cmdline 2>/dev/null | tr '\0' '\n' | grep -q -F -f "$WORK/password" && : > "$WORK/argv-hit"
  done
}

# start <password> [<index>]: a container on $VOL, waited on until it says it is ready (or stops);
# the password reaches docker through the environment, not its command line
start() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  DEVPI_ROOT_PASSWORD="$1" DEVPI_INDEX="${2:-root/public}" \
    docker run -d --name "$NAME" --network "$NET" -v "$VOL:/data" -e DEVPI_ROOT_PASSWORD -e DEVPI_INDEX "$TAG" >/dev/null
  i=0
  until docker logs "$NAME" 2>&1 | grep -q "devpi ready"; do
    i=$((i + 1))
    [ "$i" -gt 90 ] && return 1
    [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ] || return 1
    sleep 1
  done
}
login() { docker exec "$NAME" sh -c "devpi use http://127.0.0.1:3141 >/dev/null && devpi login root --password '$1' >/dev/null 2>&1"; }
has_index() { docker exec "$NAME" curl -sf -o /dev/null http://127.0.0.1:3141/root/public/+simple/; }

# the first start, watched: the command lines of this host, and another container trying root's
# empty password as fast as it can
PW="pw-$$-never-on-a-command-line"
printf '%s\n' "$PW" > "$WORK/password"
rm -f "$WORK/stop" "$WORK/argv-hit"
sample_argv & SAMPLER=$!
docker run -d --name "$PROBE" --network "$NET" --entrypoint sh "$TAG" -c \
  "while :; do curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' \
     -d '{\"user\": \"root\", \"password\": \"\"}' http://$NAME:3141/+login; sleep 0.05; done" >/dev/null
start "$PW" || fail "did not start with a password"
: > "$WORK/stop"; wait "$SAMPLER" 2>/dev/null || true; SAMPLER=
[ -e "$WORK/argv-hit" ] && fail "the password was on a command line"
docker logs "$PROBE" 2>/dev/null | grep -q '^200$' && fail "root answered the empty password from another container during the first start"
docker rm -f "$PROBE" >/dev/null
docker logs "$NAME" 2>&1 | grep -q -F -f "$WORK/password" && fail "the password is in the logs"
login "$PW" || fail "root does not open with DEVPI_ROOT_PASSWORD (first start)"
docker rm -f "$NAME" >/dev/null && docker volume rm "$VOL" >/dev/null

start "s3cret" || fail "did not start with a password"
has_index || fail "root/public missing"
login "s3cret" || fail "root does not open with DEVPI_ROOT_PASSWORD"
login "" && fail "root still opens with the empty password"

start "s3cret" || fail "did not restart with the same password"
has_index || fail "root/public missing after a restart"
login "s3cret" || fail "root does not open with DEVPI_ROOT_PASSWORD after a restart"

start "other" && fail "restarted with another password"
docker logs "$NAME" 2>&1 | grep -q "is not DEVPI_ROOT_PASSWORD" || fail "no message for another password"

start "" && fail "started without a password on a volume whose root has one"
docker logs "$NAME" 2>&1 | grep -q "has a password in this data volume" || fail "no message for an empty password on a volume with one"

docker rm -f "$NAME" >/dev/null && docker volume rm "$VOL" >/dev/null
start "" && fail "started without a password: root was open to anyone who reaches the port"
docker logs "$NAME" 2>&1 | grep -q "DEVPI_ROOT_PASSWORD is empty" || fail "no message for a start without a password"

t0=$(date +%s)
docker stop -t 30 "$NAME" >/dev/null
took=$(( $(date +%s) - t0 ))
[ "$took" -lt 5 ] || fail "docker stop took ${took}s: SIGTERM did not reach devpi-server"
[ "$(docker inspect -f '{{.State.ExitCode}}' "$NAME")" != 137 ] || fail "docker stop ended in SIGKILL (137)"

docker rm -f "$NAME" >/dev/null 2>&1 || true
t0=$(date +%s)
docker run -d --name "$NAME" -v "$VOL:/data" -e DEVPISERVER_SERVERDIR=/no-such-dir "$TAG" >/dev/null
while [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ]; do
  [ $(( $(date +%s) - t0 )) -gt 20 ] && fail "a server that cannot start kept the start waiting"
  sleep 1
done
docker logs "$NAME" 2>&1 | grep -q "devpi-server exited" || fail "no message when devpi-server exits at once"

start "" "root/Not An Index" && fail "said ready although the index could not be created"
docker logs "$NAME" 2>&1 | grep -q "devpi ready" && fail "said ready although the index could not be created"

start "" "team/dev" && fail "said ready for an index of another user than root"
docker logs "$NAME" 2>&1 | grep -q "must be root/" || fail "no message for an index of another user than root"

echo "devpi entrypoint: all checks passed"
