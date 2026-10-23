# Changelog

## Unreleased

The first version of this repository: the catalogue pages of an AISC project and the package index its
tests install from, taken from the catalogue and made into what a local AISC needs, and nothing else.

**Areas touched**
- `frontend/`: the pages only work as the catalogue of one AISC project. Accounts, sign-in, the add and edit
  pages and the switch between a hosted and a project build are gone.
- `frontend/Dockerfile`: built with Node 22 and `npm ci`, served by nginx as an unprivileged user, with the built
  app only.
- `devpi/`: requires `DEVPI_ROOT_PASSWORD`, pins Python and devpi, initialises an empty data directory, and runs
  the server as the `devpi` user (uid 10001).

**Behaviour added or changed**
- The hand-off to a local app is gone: no "Connected to local app" bar, no `web+aiscplugin` enable URI. Tests and
  controls are installed only through the project's dialogs; without a project, a test offers no install.
- The `#env=` handshake still gives the Back link, the controls address and the project. Its `url` must be on
  the platform's own origins, like its Back link and controls address. Once its hour has run out, also while
  the page is open, the page says "Open the catalogue again from the project page."
- Requests to the platform carry no `X-CSRFToken` header and no `withCredentials`: it is on the same origin and
  checks no such header.
- The sidebar's dimensions, sub-dimensions and AI systems come from the catalogue's tags, with their labels and
  in their `sort_order`. A sub-dimension chosen under a dimension narrows it to the entries of the chosen
  sub-dimensions; "For this project" follows the same rule. The hidden sector filter is gone.
- A test already installed in the project says Installed in its detail view.
- The test install dialog names the project it installs into.
- devpi does not start without a root password (root would be open to anything that reaches the port), and its
  server never runs as root: a volume an older image filled as root is handed to the `devpi` user on start.
- A devpi volume whose root opens with another password (secrets made again over an old volume) no longer stops
  the start: root's password is reset in place to `DEVPI_ROOT_PASSWORD` with `devpi-passwd`, the packages stay,
  and one line says so. If the reset fails, the start stops with the message it gave before.
- The Metrics page, like the catalogue, says to open it from a project when none is known, and sends no request.
- Keyboard and screen reader use: the filter switches, the filters, the cards and the dialogs can be reached and
  used with the keyboard, the dialogs close on Escape and take the focus, and the active filters are visible.
- A missing value shows "-", not a form placeholder; a refusal from the platform that is not text no longer
  blanks the page; a failure to load the project's dimensions says so instead of filtering nothing.
- The header logo is served from the image, not from a third-party address.
- Dependencies: axios 1.20.0, react-router 7.18.4 (in place of react-router-dom 6), Vite 7.3.7 with
  @vitejs/plugin-react 4.7.0, TypeScript 5.9.3, vitest 4.1.12 on the same Vite; the test and type packages are
  development dependencies. `npm audit` finds nothing.

**How to check it**
```
cd frontend && npm ci && npx vitest run && npx tsc --noEmit -p . && npx vite build
sh frontend/test-bundle-secrets.sh
sh frontend/test-image.sh
sh devpi/test-entrypoint.sh
```
In AISC: rebuild `catalogue-private` and `devpi` from this repository, open a project's step 3, filter with
the keyboard, open an entry, and install a test: the dialog names the project and the install lands in the
engine.
