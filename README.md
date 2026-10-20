# AISC catalogue (local)

What a local [AISC](https://github.com/lux-ai-factory/aisc) install needs from the catalogue of AI verification
tools and compliance controls: the pages a project's catalogue is shown with, and the package index the tests are
installed from. The catalogue's data is not here: AISC reads it from the hosted catalogue through its platform,
and keeps each project's own copy.

| Folder | What it is | In AISC |
|---|---|---|
| [`frontend/`](frontend) | The catalogue pages of one AISC project (React, Vite): browse and filter the tests and controls, see their metrics, and install them into the project. They read the project's catalogue from the AISC platform on the same origin, with the person's own sign-in. | the `catalogue-private` service, served under `/project-catalogue/` |
| [`devpi/`](devpi) | A [devpi](https://devpi.net) package index with one index, `root/public`, that the tests' packages are published to and installed from. | the `devpi` service |

Both are built by AISC's compose files; neither is meant to run alone.

## Build

```
docker build -t aisc-catalogue-private --build-arg CATALOGUE_BASE=/project-catalogue/ frontend
docker build -t aisc-catalogue-devpi devpi
```

## Tests

```
cd frontend && npm ci && npx vitest run && npx tsc --noEmit -p .
sh devpi/test-entrypoint.sh      # builds the image and checks its start-up in throwaway containers
```

## License

Apache License 2.0, see [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md).
