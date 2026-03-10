# Archetype Frontend Guide

## Runtime Policy (Mandatory)

- Frontend can run directly via `pnpm` from this directory.
- Backend must run via Docker Compose (either `api/compose.yaml` for backend-focused work or `infrastructure/compose.yaml` for full stack).

## Frontend Architecture

- Stack: Next.js App Router + React + TypeScript + TanStack Query (`package.json`).
- Route layout split:
  - Public site routes in `app/(site)/*` with header/footer shell in `app/(site)/layout.tsx`.
  - Backoffice routes in `app/backoffice/*` with guarded shell in `app/backoffice/layout.tsx` and `components/backoffice/layout/backoffice-shell.tsx`.
- Root providers are composed in `app/layout.tsx`:
  - auth, site features, model labels, query provider, collection, and search context.
- Data access patterns:
  - `lib/api-fetch.ts` centralizes base URL request calls.
  - `services/backoffice/*` provides backoffice API client and typed CRUD helpers.
  - Query keys are centralized under `lib/*/query-keys.ts`.
- State:
  - React contexts in `contexts/*`.
  - Zustand store for lightbox behavior in `stores/lightbox-store.ts`.
  - Dexie persistence for lightbox data in `lib/lightbox-db.ts`.
- Auth:
  - Token login/profile calls target backend `/api/v1/auth/*`.
  - Backoffice shell enforces authenticated + staff-only access client-side.

## Frontend Commands (run in `/home/green/hub/archetype/v3/frontend`)

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm format:fix`
- `pnpm test`
- `pnpm test:watch`
- `pnpm analyze`

## Required Environment

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_IIIF_UPSTREAM`
- `NEXT_PUBLIC_SITE_URL`
- `CORS_ALLOWED_ORIGINS`

Notes:

- `NEXT_PUBLIC_API_URL` should not include a trailing slash.
- Missing required env values will fail startup (`lib/env.ts`, `next.config.mjs`).
- API/IIIF rewrites are defined in `next.config.mjs` and depend on these env vars.

## Backend Coordination

- If backend is started from `api/compose.yaml`, API is typically reachable at `http://localhost:8000`.
- If backend is started from `infrastructure/compose.yaml`, traffic is commonly routed through nginx (`http://localhost` / `https://localhost` depending on setup).
- Keep `NEXT_PUBLIC_API_URL` aligned with whichever backend runtime mode is active.
