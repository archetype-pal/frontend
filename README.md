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

Copy env setting, then start project :

```bash
cp .env.dev-compose .env
docker compose up
```

Live reload is enabled. We assume backend services are running on `localhost` and reachable from the container. If not, adjust the `.env`.
If backend/image services are on your machine, they must also be reachable from the container and from client devices (CORS and host/IP values in env vars may need to be updated).

App URL: `http://localhost:3000`

## Run With Docker (Local)

The `Dockerfile` builds a production image and runs Next.js in standalone mode on port `3000`.

### Run in production with Traefik

This mode is available if you have Traefik running as application proxy on your machine.

Copy env setting, then start project:

```bash
cp .env.prod-traefik .env
docker compose up
```

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm test
```
