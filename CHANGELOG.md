# Changelog

## Unreleased

The first version of this repository: the catalogue pages of an AISC project and the package index its
tests install from, taken from the catalogue and made into what a local AISC needs, and nothing else.

**Areas touched**
- `frontend/`: the pages only work as the catalogue of one AISC project. Accounts, sign-in, the add and edit
  pages and the switch between a hosted and a project build are gone.
- `frontend/Dockerfile`: built with Node 22 and `npm ci`, served by nginx as an unprivileged user, with the built
  app only.
- `devpi/`: requires `DEVPI_ROOT_PASSWORD`, pins Python and devpi, initialises an empty data directory.

**Behaviour added or changed**
- The `#env=` handshake's local app must be on the platform's own origins, like its Back link and controls
  address: a crafted link can no longer send an install to another site.
- The test install dialog names the project it installs into.
- devpi does not start without a root password (root would be open to anything that reaches the port).
- The Metrics page, like the catalogue, says to open it from a project when none is known, and sends no request.
- Keyboard and screen reader use: the filter switches, the filters, the cards and the dialogs can be reached and
  used with the keyboard, the dialogs close on Escape and take the focus, and the active filters are visible.
- A missing value shows "-", not a form placeholder; a refusal from the platform that is not text no longer
  blanks the page; a failure to load the project's dimensions says so instead of filtering nothing.
- The header logo is served from the image, not from a third-party address.
- Dependencies: axios 1.20.0, react-router-dom 6.30.6, vitest 4.1.12; the test and type packages are development
  dependencies; build tools held at their fixed versions.

**How to check it**
```
cd frontend && npm ci && npx vitest run && npx tsc --noEmit -p . && npx vite build
sh frontend/test-image.sh
sh devpi/test-entrypoint.sh
```
In AISC: rebuild `catalogue-private` and `devpi` from this repository, open a project's step 3, filter with
the keyboard, open an entry, and install a test: the dialog names the project and the install lands in the
engine.
