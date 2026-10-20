#!/bin/sh
# Builds this image and checks what entrypoint.sh promises, in throwaway containers (own names, own
# volume, no published port) that it removes afterwards:
# - root/public exists after the first start and after a restart on the same data, and the index
#   DEVPI_INDEX names (root/dev) when it names one;
# - with DEVPI_ROOT_PASSWORD, root opens with it and no longer with the empty password, also after a
#   restart; a restart with a different one stops with a message;
# - without it, it does not start: root would be open to anyone who reaches the port (a message says so,
#   on a new volume and on one whose root has a password);
# - the password is never on a command line (any user of the Docker host can read those with ps), and
#   root does not answer to the empty password from another container while the first start sets it;
# - an index that cannot be created stops the start: no "devpi ready"; so does an index of another
#   user than root (DEVPI_INDEX=team/dev), which would be created as root/dev;
# - docker stop reaches devpi-server (SIGTERM, not a SIGKILL after the grace period), also while the start
#   is still setting up, and a server that exits at once stops the start at once, not after the 60 s
#   readiness wait;
# - an empty bind-mounted data directory is initialised on the first start;
# - devpi-server, and the start once it has handed over, run as a user other than root, also on a volume
#   whose files are all root's, as the image that ran as root left them, which keeps its index and password;
# - DEVPI_PORT moves the server to another port, and DEVPI_HOST=127.0.0.1 keeps it from other containers.
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
  # the server's files in the bind-mounted directory are root's: removed from a container
  [ -d "$WORK/bind" ] && docker run --rm -v "$WORK/bind:/d" --entrypoint sh "$TAG" -c 'rm -rf /d/* /d/.[!.]*' >/dev/null 2>&1
  true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker image rm "$TAG" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker build -q -t "$TAG" "$(dirname "$0")" >/dev/null
docker network create "$NET" >/dev/null

# Every process's command line on this host, read until the file $WORK/stop exists; a hit on the
# password (grep reads it from a file, so it is in no command line of ours) leaves $WORK/argv-hit, and
# one on devpi-server (read from a file the same way) leaves $WORK/argv-seen: the sampler saw the server.
sample_argv() {
  while [ ! -e "$WORK/stop" ]; do
    argv=$(cat /proc/[0-9]*/cmdline 2>/dev/null | tr '\0' '\n')
    printf '%s\n' "$argv" | grep -q -F -f "$WORK/password" && : > "$WORK/argv-hit"
    printf '%s\n' "$argv" | grep -q -F -f "$WORK/server" && : > "$WORK/argv-seen"
  done
}

# start <password> [<index>]: a container on $VOL (or on $DATA when set), waited on until it says it is
# ready (or stops); the password reaches docker through the environment, not its command line. $LISTEN,
# when set, adds docker run options such as "-e DEVPI_PORT=3200".
start() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  # shellcheck disable=SC2086
  DEVPI_ROOT_PASSWORD="$1" DEVPI_INDEX="${2:-root/public}" \
    docker run -d --name "$NAME" --network "$NET" -v "${DATA:-$VOL}:/data" -e DEVPI_ROOT_PASSWORD -e DEVPI_INDEX \
    ${LISTEN:-} "$TAG" >/dev/null
  i=0
  until docker logs "$NAME" 2>&1 | grep -q "devpi ready"; do
    i=$((i + 1))
    [ "$i" -gt 90 ] && return 1
    [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ] || return 1
    sleep 1
  done
}
login() { docker exec "$NAME" sh -c "devpi use http://127.0.0.1:3141 >/dev/null && devpi login root --password '$1' >/dev/null 2>&1"; }
# has_index [<index>]: root/public unless named
has_index() { docker exec "$NAME" curl -sf -o /dev/null "http://127.0.0.1:3141/${1:-root/public}/+simple/"; }
# reach <host:port>: whether devpi answers there from another container on the network
reach() { docker run --rm --network "$NET" --entrypoint curl "$TAG" -sf -m 5 -o /dev/null "http://$1/+api"; }
# not_root: devpi-server, and the start script (PID 1), run as a user other than root
not_root() {
  uids=$(docker top "$NAME" -eo pid,uid,args | awk '/devpi-server/ && !/awk/ { print $2 }')
  [ -n "$uids" ] || fail "no devpi-server in the container"
  echo "$uids" | grep -qx 0 && fail "devpi-server runs as root"
  [ "$(docker exec "$NAME" awk '/^Uid:/ { print $2 }' /proc/1/status)" != 0 ] || fail "the start script runs as root"
}

# the first start, watched: the command lines of this host, and another container trying root's
# empty password as fast as it can
PW="pw-$$-never-on-a-command-line"
printf '%s\n' "$PW" > "$WORK/password"
printf '%s\n' devpi-server > "$WORK/server"
rm -f "$WORK/stop" "$WORK/argv-hit" "$WORK/argv-seen"
sample_argv & SAMPLER=$!
docker run -d --name "$PROBE" --network "$NET" --entrypoint sh "$TAG" -c \
  "while :; do curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' \
     -d '{\"user\": \"root\", \"password\": \"\"}' http://$NAME:3141/+login; sleep 0.05; done" >/dev/null
start "$PW" || fail "did not start with a password"
: > "$WORK/stop"; wait "$SAMPLER" 2>/dev/null || true; SAMPLER=
[ -e "$WORK/argv-seen" ] || fail "sampler saw nothing: no devpi-server among this host's command lines"
[ -e "$WORK/argv-hit" ] && fail "the password was on a command line"
# the probe must have reached the server: once it serves, the empty password gets a 401
i=0
until docker logs "$PROBE" 2>/dev/null | grep -q '^401$'; do
  i=$((i + 1)); [ "$i" -gt 20 ] && fail "the empty-password probe never reached the server"
  sleep 0.5
done
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
not_root

# a volume the image used to run as root on: every file in it root's, with its index and password
docker rm -f "$NAME" >/dev/null
docker run --rm --user 0 -v "$VOL:/data" --entrypoint chown "$TAG" -R 0:0 /data
[ -z "$(docker run --rm --user 0 -v "$VOL:/data" --entrypoint find "$TAG" /data ! -user 0)" ] \
  || fail "the volume was not made root's"
start "s3cret" || fail "did not start on a volume whose files are root's"
has_index || fail "root/public missing on a volume whose files were root's"
login "s3cret" || fail "root does not open with DEVPI_ROOT_PASSWORD on a volume whose files were root's"
not_root

start "other" && fail "restarted with another password"
docker logs "$NAME" 2>&1 | grep -q "is not DEVPI_ROOT_PASSWORD" || fail "no message for another password"
docker logs "$NAME" 2>&1 | grep -q -e "env.secrets" -e "plugin-publisher" && fail "the message names files and services of another repo"

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

# a stop while the setup server is still coming up
docker rm -f "$NAME" >/dev/null 2>&1 || true
DEVPI_ROOT_PASSWORD=s3cret docker run -d --name "$NAME" -v "$VOL:/data" -e DEVPI_ROOT_PASSWORD "$TAG" >/dev/null
sleep 1
t0=$(date +%s)
docker stop -t 30 "$NAME" >/dev/null
took=$(( $(date +%s) - t0 ))
[ "$took" -lt 5 ] || fail "docker stop during the setup took ${took}s: SIGTERM was not handled"
[ "$(docker inspect -f '{{.State.ExitCode}}' "$NAME")" != 137 ] || fail "docker stop during the setup ended in SIGKILL (137)"
docker logs "$NAME" 2>&1 | grep -q "devpi ready" && fail "a stop during the setup went on to serve"

# an empty directory from the host holds none of the data the image was built with
mkdir "$WORK/bind"
DATA="$WORK/bind"
start "s3cret" || fail "did not start on an empty bind-mounted directory"
has_index || fail "root/public missing on a bind-mounted directory"
not_root
DATA=

docker rm -f "$NAME" >/dev/null 2>&1 || true
t0=$(date +%s)
DEVPI_ROOT_PASSWORD=s3cret docker run -d --name "$NAME" -v "$VOL:/data" -e DEVPI_ROOT_PASSWORD -e DEVPI_PORT=not-a-port "$TAG" >/dev/null
while [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ]; do
  [ $(( $(date +%s) - t0 )) -gt 20 ] && fail "a server that cannot start kept the start waiting"
  sleep 1
done
docker logs "$NAME" 2>&1 | grep -q "devpi-server exited" || fail "no message when devpi-server exits at once"

# with a password, on a new volume: the start can only stop at the index
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker volume rm "$VOL" >/dev/null
start "s3cret" "root/Not An Index" && fail "said ready although the index could not be created"
docker logs "$NAME" 2>&1 | grep -q "devpi ready" && fail "said ready although the index could not be created"
docker logs "$NAME" 2>&1 | grep -q "could not create the index" || fail "no message for an index that could not be created"

# another of root's indexes, named by DEVPI_INDEX
start "s3cret" "root/dev" || fail "did not start with DEVPI_INDEX=root/dev"
has_index "root/dev" || fail "root/dev missing with DEVPI_INDEX=root/dev"

start "" "team/dev" && fail "said ready for an index of another user than root"
docker logs "$NAME" 2>&1 | grep -q "must be root/" || fail "no message for an index of another user than root"

# DEVPI_PORT: the server answers on that port, from another container too, and not on 3141
LISTEN="-e DEVPI_PORT=3200"
start "s3cret" || fail "did not start with DEVPI_PORT=3200"
reach "$NAME:3200" || fail "no answer on DEVPI_PORT=3200 from another container"
reach "$NAME:3141" && fail "still answers on 3141 with DEVPI_PORT=3200"

# DEVPI_HOST=127.0.0.1: the server answers inside its container only
LISTEN="-e DEVPI_HOST=127.0.0.1"
start "s3cret" || fail "did not start with DEVPI_HOST=127.0.0.1"
docker exec "$NAME" curl -sf -o /dev/null http://127.0.0.1:3141/+api || fail "no answer on 127.0.0.1 with DEVPI_HOST=127.0.0.1"
reach "$NAME:3141" && fail "reachable from another container with DEVPI_HOST=127.0.0.1"
LISTEN=

echo "devpi entrypoint: all checks passed"
