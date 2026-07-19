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

Runs on its **own** network (not joined to the backend stack's Docker network).
The **browser** talks to the backend on the public `localhost` URLs from `.env`;
the **Next server** (SSR/route handlers/`/iiif-proxy`) reaches it through the
host's published ports via `host.docker.internal`, using the server-only
`INTERNAL_API_URL` / `INTERNAL_IIIF_UPSTREAM` set in `compose.yml`. (The backend
already allows the `host.docker.internal` Host — `api/config/.env` `ALLOWED_HOSTS`.)

Requires the backend stack to be running first (`just up` in `api/`, which
publishes the API on `localhost:8000` and IIIF on `localhost:1024`), then:

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
