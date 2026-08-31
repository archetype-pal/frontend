# Archetype Frontend Guide

## Runtime Policy (Mandatory)

- The frontend runs in Docker by default: `just up` (alias `just dev`) from this
  directory. Every justfile recipe executes inside the dev container, and env
  values are baked into `compose.yml`.
- Host-native `pnpm` remains a supported alternative and needs its own `.env`
  (`cp .env.example .env`).
- Backend must run via Docker Compose — `api/compose.yaml` for backend-focused
  work, `infrastructure/compose.yaml` for the full stack. These are two distinct
  compose projects (`archetype-dev` and `archetype`) and can run side by side.

## Frontend Architecture

- Stack: Next.js App Router + React + TypeScript + TanStack Query (`package.json`).
- Route layout split:
  - Public site routes in `app/(site)/*` with header/footer shell in `app/(site)/layout.tsx`.
  - Backoffice routes in `app/backoffice/*` with guarded shell in `app/backoffice/layout.tsx` and `components/backoffice/layout/backoffice-shell.tsx`.
- Request-level logic lives in **`proxy.ts`** — Next.js 16's rename of
  `middleware.ts`. It builds the per-request CSP nonce, redirects unauthenticated
  `/backoffice` requests to `/login`, and gates feature-flagged sections. A search
  for `middleware.ts` finds nothing.
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
  - Three checks guard the backoffice, at three layers, and only the last is the
    security boundary: `proxy.ts` checks that the auth cookie _exists_;
    `BackofficeShell` checks `is_staff` client-side; the backend's management
    viewsets require **`is_superuser`**. A staff-but-not-superuser account
    reaches the UI and is refused by every write.

## Frontend Commands (run in this directory)

Preferred (containerised — each runs inside the dev container):

- `just up` / `just up-bg` / `just down`
- `just lint` · `just lint-fix` · `just format` · `just format-fix`
- `just test` · `just test-watch`
- `just build` · `just build-image` · `just install`
- `just bundle-budget` · `just bundle-budget-update` · `just bash`

> **`just bundle-budget` is a CI gate.** `scripts/check-bundle-budget.mjs` fails
> the build when the total gzip bundle exceeds `.bundle-budget.json`
> (last-measured × 1.1), so adding a route or feature can break CI even when
> lint, tsc and tests pass. For intentional growth: `just bundle-budget-update`,
> then commit the refreshed budget file.

Host-native equivalents:

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
