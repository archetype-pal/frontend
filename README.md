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

## Local Development

The frontend runs directly with pnpm — there is no Docker mode in this repo.
The backend stack it talks to runs via Docker Compose from the backend repo
(`api/`), and staging/production deployments (including the containerized
frontend image built from `Dockerfile`) are orchestrated by the
[infrastructure repo](https://github.com/archetype-pal/infrastructure).

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

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm lint:fix
pnpm test
```
