# Archetype Frontend

Next.js frontend for the Archetype project.

## Quick Start (Docker — recommended)

No host Node toolchain or env setup needed. Start the backend stack first
(`just up` in the backend repo), then:

```bash
just up          # or: docker compose up
```

App URL: `http://localhost:3000` — live reload works through the bind mount.

The dev container reaches the backend via `host.docker.internal`; browsers
use plain `localhost` URLs. Works out of the box on Linux, macOS (Apple
Silicon included — all images are multi-arch), and Windows (run commands
from WSL2 and keep the checkout in the WSL2 filesystem so live reload sees
file changes).

Run `just` with no arguments to list every recipe — lint, tests, build, and
the bundle gate all run inside the container:

```bash
just lint
just test
just build
```

After changing `package.json`/`pnpm-lock.yaml`, refresh the shared deps
volume with `just install`.

## Host-Native Alternative (pnpm)

Requires Node `>=26` and pnpm `>=10`, plus a `.env`:

```bash
cp .env.example .env   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_IIIF_UPSTREAM,
                       # NEXT_PUBLIC_SITE_URL, CORS_ALLOWED_ORIGINS
pnpm install
pnpm dev               # also: lint / test / build / format
```

## Deployment

Nothing in this repo deploys anywhere: CI builds the production image from
`Dockerfile`, and staging/production run from the
[infrastructure repo](https://github.com/archetype-pal/infrastructure).
