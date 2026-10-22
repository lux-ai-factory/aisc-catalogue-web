# AISC project catalogue (frontend)

The catalogue of tests and controls as seen from an AISC project. A local AISC
install serves this build under `/project-catalogue/` on the launcher's origin,
and opens it from a project page as `/project-catalogue/catalogue?project=<slug>`.

Built with React 19, react-router 7, Vite 7 and TypeScript 5.

What it does:

- Reads the AISC platform on the same origin, `/api/projects/{slug}/catalogue/...`,
  for the project named by `?project=<slug>` (kept for the tab, so moving to the
  Metrics page keeps it). Opened without a project, it says so and loads nothing.
  Requests are relative and carry the sign-in cookie by themselves: no
  `withCredentials`, no CSRF header (the platform checks none).
- Says whether the project reads a private copy or the public catalogue live, and
  lets an admin update a private copy from the public catalogue.
- Filters by the dimensions, sub-dimensions and AI systems of the catalogue's own
  tags, in their order. A sub-dimension chosen under a dimension narrows it to the
  entries of the chosen sub-dimensions. "For this project" (on by default) keeps
  the entries of the project's dimensions, a sub-dimension counting for its parent.
  Local and Installed entries are marked.
- Installs from the detail pop-up without leaving the page, through the project's
  dialogs only: a test through the platform's `install-info` and `install`
  endpoints (a test already installed says Installed), a control through the
  platform's controls app. There is no hand-off to a local app.
- Takes the `#env=` handshake the launcher adds to the link: it gives the Back
  link, the controls app and the project. It is kept per tab, lasts an hour at
  most, and its Back link and controls app are used only when they are on the
  platform's origins: the page's own, those in `VITE_BACK_ORIGINS`, and the
  install's engine as the launcher's site answers it at `/origins.json` (read once
  when the app starts, so an engine that moved off its port needs no rebuild). Once
  its hour has run out, the page says "Open the catalogue again from the project page."

There are no accounts and no pages to add or edit entries: any other path leads
to the catalogue.

## Build

The Dockerfile builds the app with Node, then serves only the built files with nginx, as an unprivileged
user, on port 3000. Every address that is not a file gets the app's `index.html`, so the app's own pages
(`/catalogue`, `/metrics`) load directly:

```
docker build --build-arg CATALOGUE_BASE=/project-catalogue/ .
```

Build arg: `CATALOGUE_BASE`, the path the build is served under (`/` by default). The image itself
serves at `/`: the gateway in front (AISC's Caddy) strips the base path before passing a request on, so a
build for `/project-catalogue/` opened directly on port 3000 shows a blank page.

`VITE_BACK_ORIGINS` (comma-separated, `http://localhost,http://localhost:8100`
by default) lists the other origins the platform runs on, e.g. for a dev server
on another port. It is read at build time; the Dockerfile has no argument for it. The install's engine
needs no entry here: the app reads it from `/origins.json` on its own site, and where there is no such
file (the hosted public catalogue) it trusts this list alone.

## Development

```
npm install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # production build into build/
npm run preview    # serve the build locally
```

The pages expect the AISC platform on the same origin, so a dev server alone
shows the "open this catalogue from a project" message.

## Tests

```
npm test                    # vitest run (jsdom)
npx tsc --noEmit -p .
sh test-bundle-secrets.sh   # builds with canary values in secret-looking VITE_ variables: none may be in the build
sh test-image.sh            # builds the image and checks what it serves and as whom
```
