# AISC catalogue (local)

What a local [AISC](https://github.com/lux-ai-factory/aisc) install needs from the catalogue of AI verification
tools and compliance controls: the pages a project's catalogue is shown with, and the package index the tests are
installed from. The catalogue's data is not here: AISC reads it from the hosted catalogue through its platform,
and keeps each project's own copy.

| Folder | What it is | In AISC |
|---|---|---|
| [`frontend/`](frontend) | The catalogue pages of one AISC project (React 19, react-router 7, Vite 7): browse and filter the tests and controls, see their metrics, and install them into the project. They read the project's catalogue from the AISC platform on the same origin, with the person's own sign-in. | the `catalogue-private` service, served under `/project-catalogue/` |
| [`devpi/`](devpi) | A [devpi](https://devpi.net) package index with one index, `root/public`, that the tests' packages are published to and installed from. The server runs as the `devpi` user (uid 10001), never as root. | the `devpi` service |

Both are built by AISC's compose files; neither is meant to run alone.

## devpi environment

| Variable | Default | What it is |
|---|---|---|
| `DEVPI_ROOT_PASSWORD` | none, required | root's password, set on the first start. Without it devpi does not start: whoever logs in as root can publish packages the engine installs and runs. A restart must use the same one. |
| `DEVPI_INDEX` | `root/public` | the index the tests are published to, created on the first start. It must be one of root's, `root/<name>`. |
| `DEVPI_HOST` | `0.0.0.0` | the address the server listens on once set up (the setup itself listens on 127.0.0.1 only). |
| `DEVPI_PORT` | `3141` | the port it listens on. |
| `DEVPISERVER_SERVERDIR` | `/data` | the server's data directory; mount a volume or a directory here. An empty one is initialised on the first start. Started as root (the default), the image hands it to the `devpi` user (uid 10001) and goes on as that user, so a volume an older image filled as root keeps its index and password. |

## Build

```
docker build -t aisc-catalogue-private --build-arg CATALOGUE_BASE=/project-catalogue/ frontend
docker build -t aisc-catalogue-devpi devpi
```

## Tests

```
cd frontend && npm ci && npx vitest run && npx tsc --noEmit -p . && npx vite build
sh frontend/test-bundle-secrets.sh  # builds with canary values in secret-looking VITE_ variables: none may be in the build
sh frontend/test-image.sh           # builds the frontend image and checks what it serves and as whom
sh devpi/test-entrypoint.sh         # builds the devpi image and checks its start-up in throwaway containers
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): contributions are made under the contributor license agreements in this
repository (`AISC ICLA (Individuals).txt`, `AISC CCLA (Entities).txt`). The project is run as described in
[GOVERNANCE.md](GOVERNANCE.md); contributors are listed in [CONTRIBUTORS.md](CONTRIBUTORS.md). What changed is in
[CHANGELOG.md](CHANGELOG.md).

## License

Apache License 2.0, see [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md).
