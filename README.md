# Archetype Frontend

Next.js frontend for the Archetype project.

## Prerequisites

- Node.js `>=22`
- pnpm `>=10`
- Docker (for containerized local runs)

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

## Local Development (pnpm)

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

## Local Development (docker compose)

Uses the same `.env` as host-run `pnpm dev`: the container joins the backend
stack's Docker network and forwards its own `localhost:8000`/`localhost:1024`
to the `api`/`image_server` services (see `dev-entrypoint.sh`), so the
`localhost` URLs work unchanged.

Requires the backend stack to be running first (`just up` in `api/`), then:

```bash
cp .env.example .env
docker compose up   # or: just up
```

Live reload is enabled.

After changing dependencies (`pnpm-lock.yaml`), rebuild the image and refresh
the container's `node_modules` volume:

```bash
just rebuild   # docker compose up --build --renew-anon-volumes
```

App URL: `http://localhost:3000`

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm test
```
