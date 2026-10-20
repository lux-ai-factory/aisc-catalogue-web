#!/bin/sh
# Builds the app with canary values in VITE_ variables named like secrets and checks that none of them is
# anywhere in the build: whatever a VITE_ variable holds and the code reads is inlined into the JavaScript
# every visitor downloads. VITE_BACK_ORIGINS, which the code does read, carries a canary too, and must be
# found: a search that cannot find what is there proves nothing.
# Usage: sh frontend/test-bundle-secrets.sh (after npm ci)
set -eu
cd "$(dirname "$0")"
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

C=canary-$$
VITE_API_TOKEN=$C-api-token \
VITE_TOKEN=$C-token \
VITE_SECRET=$C-secret \
VITE_CLIENT_SECRET=$C-client-secret \
VITE_PASSWORD=$C-password \
VITE_API_KEY=$C-api-key \
VITE_ACCESS_KEY=$C-access-key \
VITE_DEVPI_ROOT_PASSWORD=$C-devpi-root-password \
VITE_BACK_ORIGINS=http://$C-back-origin.example \
  npx vite build --outDir "$OUT" --emptyOutDir --logLevel error >/dev/null

[ -n "$(ls -A "$OUT")" ] || fail "the build wrote nothing"
grep -rq -- "$C-back-origin" "$OUT" || fail "VITE_BACK_ORIGINS's canary is not in the build: the search finds nothing"
hits=$(grep -rlo -- "$C-[a-z-]*" "$OUT" | sort -u)
leaked=$(grep -rho -- "$C-[a-z-]*" "$OUT" | grep -v -- "-back-origin" | sort -u || true)
[ -z "$leaked" ] || fail "secret-looking VITE_ values are in the build: $(echo $leaked) (in $(echo $hits))"
echo "bundle secrets: all checks passed"
