#!/bin/sh
# Start devpi-server and make sure the index the tests are published to exists.
#
# The image is built with `devpi-init --no-root-pypi`, so the server comes up
# with a root user and nothing else; a data directory that has not been
# initialised (an empty bind mount) is initialised the same way here. This
# creates the publish index once, idempotently, then hands over to the server
# in the foreground.
#
# Root's password: the image's is empty. The one handed in (DEVPI_ROOT_PASSWORD, required) is set the
# first time (a restart already has it): whoever can log in as root can publish a package the engine
# installs and runs, so without a password it does not start. So the setup runs on a server that listens on the loopback only, and the password goes to it
# through the environment and an HTTP body, never a command line (any user of the Docker host reads
# those with ps). Then the server is started again where it serves.
set -eu

HOST=${DEVPI_HOST:-0.0.0.0}
PORT=${DEVPI_PORT:-3141}
# Take the index name, then take it OUT of the environment: the devpi *client*
# also reads DEVPI_INDEX, and would try to select an index that does not exist
# yet, which fails before we have had the chance to create it.
INDEX_SPEC=${DEVPI_INDEX:-root/public}
unset DEVPI_INDEX
# Only root's indexes are created here: team/dev would silently become root/dev.
case "$INDEX_SPEC" in
  root/?*) ;;
  *) echo "devpi: DEVPI_INDEX must be root/<index> (got '$INDEX_SPEC'): this image creates root's index only" >&2; exit 1 ;;
esac
INDEX_NAME=${INDEX_SPEC#*/}

# This shell is PID 1, which the kernel gives no default signal handling: without the trap,
# docker stop's SIGTERM is dropped and the server is SIGKILLed after the grace period. It is set
# before anything starts and signals whichever server runs now; a stop during the setup ends the
# start instead of serving.
SERVER_PID=
STOPPING=
trap 'STOPPING=1; [ -z "$SERVER_PID" ] || kill -TERM "$SERVER_PID" 2>/dev/null' TERM INT

# devpi-init writes .serverversion: without it the directory holds no server data
if [ ! -e "$DEVPISERVER_SERVERDIR/.serverversion" ]; then
  devpi-init --serverdir "$DEVPISERVER_SERVERDIR" --no-root-pypi
fi

serve() {
  [ -z "$STOPPING" ] || exit 143
  devpi-server --serverdir "$DEVPISERVER_SERVERDIR" --host "$1" --port "$PORT" --restrict-modify root &
  SERVER_PID=$!
  i=0
  until curl -sf -o /dev/null "http://127.0.0.1:${PORT}/+api"; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      [ -z "$STOPPING" ] || exit 143
      echo "devpi-server exited before it was ready" >&2
      exit 1
    fi
    i=$((i + 1))
    [ "$i" -gt 60 ] && { echo "devpi did not come up in 60s" >&2; exit 1; }
    sleep 1
  done
}

# 1. setup, reachable from this container only
serve 127.0.0.1
python3 - "$PORT" "$INDEX_NAME" <<'PY'
import base64, json, os, sys, urllib.error, urllib.parse, urllib.request

port, index = sys.argv[1], urllib.parse.quote(sys.argv[2], safe="")
base = f"http://127.0.0.1:{port}"
password = os.environ.get("DEVPI_ROOT_PASSWORD", "")


def call(method, path, body=None, auth=None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if auth:
        headers["X-Devpi-Auth"] = auth
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, None


def login(pw):
    """root's X-Devpi-Auth with this password, or None when it does not open root."""
    status, answer = call("POST", "/+login", {"user": "root", "password": pw})
    if status != 200:
        return None
    return base64.b64encode(f"root:{answer['result']['password']}".encode()).decode()


def stop(*lines):
    for line in lines:
        print(f"devpi: {line}", file=sys.stderr)
    sys.exit(1)


auth = login(password) if password else None
if auth is None:
    empty = login("")
    if empty is None:
        # the volume keeps another password for root, and only that one opens it
        if password:
            stop("root's password in this data volume is not DEVPI_ROOT_PASSWORD (env.secrets was made again?).",
                 "start it with the old DEVPI_ROOT_PASSWORD, or remove the devpi data volume (the index is",
                 "refilled by plugin-publisher) and start again.")
        stop("root has a password in this data volume, and DEVPI_ROOT_PASSWORD is empty:",
             "start it with that password, or remove the devpi data volume and start again.")
    if password:
        status, _ = call("PATCH", "/root", {"password": password}, empty)
        if status != 200:
            stop(f"setting root's password failed ({status})")
        auth = login(password)
        if auth is None:
            stop("root does not open with the password just set")
        print("devpi: root's password set")
    else:
        stop(f"DEVPI_ROOT_PASSWORD is empty: root would be open to anything that reaches port {port}, which could",
             "then publish packages the engine installs and runs. Start it with a password.")

# already there on a restart, which is not an error; anything else is
if call("GET", f"/root/{index}")[0] != 200:
    status, _ = call("PUT", f"/root/{index}", {"type": "stage", "bases": [], "volatile": True}, auth)
    if status not in (200, 201):
        stop(f"could not create the index root/{index} ({status})")
PY
kill "$SERVER_PID"
wait "$SERVER_PID" || true

# 2. serve
serve "$HOST"
echo "devpi ready: ${INDEX_SPEC} at http://127.0.0.1:${PORT}/${INDEX_SPEC}/+simple/"
set +e
wait "$SERVER_PID"
status=$?
# a trapped signal ends the wait at once: wait again for the server's own shutdown
if [ "$status" -gt 128 ] && kill -0 "$SERVER_PID" 2>/dev/null; then
  wait "$SERVER_PID"
  status=$?
fi
exit "$status"
