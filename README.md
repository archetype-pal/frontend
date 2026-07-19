# Archetype Frontend

Next.js frontend for the Archetype project.

## Prerequisites

- Node.js `>=26`
- pnpm `>=10`

## Environment Variables

Copy the sample file and adjust values as needed:

```bash
cp .env.example .env
```

Important variables:

- `NEXT_PUBLIC_API_URL` (required)
- `NEXT_PUBLIC_IIIF_UPSTREAM` (required)
- `NEXT_PUBLIC_SITE_URL` (required)
- `CORS_ALLOWED_ORIGINS` (required, used by `/api/*` headers)

## Local Development (pnpm — canonical)

The backend stack the frontend talks to runs via Docker Compose from the
backend repo (`api/`). Staging/production deployments (including the
containerized frontend image built from `Dockerfile`) are orchestrated by the
[infrastructure repo](https://github.com/archetype-pal/infrastructure) —
nothing in this repo deploys anywhere.

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

App URL: `http://localhost:3000`

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Local Development (docker compose — no host Node needed)

If you only cloned this repo and don't want a Node toolchain on the host,
run the dev server in a container instead:

```bash
cp .env.dev-compose .env
docker compose up
```

App URL: `http://localhost:3000` — live reload works through the bind mount.

The container reaches the backend on the Docker host via
`host.docker.internal` (see the comments in `.env.dev-compose`; on a
bare-Linux browser add `127.0.0.1 host.docker.internal` to `/etc/hosts`).
Start the backend stack from the backend repo first: `just up` in `api/`.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm test
```

A [justfile](justfile) wraps these plus the docker recipes — run `just` with
no arguments to list everything (`just dev`, `just up`, `just lint`, …).
