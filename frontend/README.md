# AISC project catalogue (frontend)

The catalogue of tests and controls as seen from an AISC project. A local AISC
install serves this build under `/project-catalogue/` on the launcher's origin,
and opens it from a project page as `/project-catalogue/catalogue?project=<slug>`.

What it does:

- Reads the AISC platform on the same origin, `/api/projects/{slug}/catalogue/...`,
  for the project named by `?project=<slug>` (kept for the tab, so moving to the
  Metrics page keeps it). Opened without a project, it says so and loads nothing.
- Says whether the project reads a private copy or the public catalogue live, and
  lets an admin update a private copy from the public catalogue.
- Keeps the entries of the project's dimensions ("For this project", on by
  default) and marks Local and Installed entries.
- Installs from the detail pop-up without leaving the page: a test through the
  platform's `install-info` and `install` endpoints, a control through the
  platform's controls app.
- Takes the `#env=` handshake the launcher adds to the link. It is kept per tab,
  lasts an hour at most, and its Back link and controls app are used only when
  they are on the platform's origins: the page's own, and those in
  `VITE_BACK_ORIGINS`.

There are no accounts and no pages to add or edit entries: any other path leads
to the catalogue.

## Build

The Dockerfile builds the app and serves the `build` folder on port 3000:

```
docker build --build-arg CATALOGUE_BASE=/project-catalogue/ .
```

Build args:

- `CATALOGUE_BASE`: the path the build is served under (`/` by default).
- `VITE_API_URL`: the origin used for reads when no project is known (blank by
  default, which means `/api` on the page's own origin).

`VITE_BACK_ORIGINS` (comma-separated, `http://localhost,http://localhost:8100`
by default) lists the other origins the platform runs on, e.g. for a dev server
on another port. It is read at build time; the Dockerfile has no argument for it.

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
npm test           # vitest run (jsdom)
npx tsc --noEmit -p .
```
