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

- Stack: Next.js 16 App Router, React 19, TypeScript, TanStack Query, Tailwind 4,
  next-intl (`package.json`).
- Route layout split:
  - Public site routes in `app/(site)/*` with header/footer shell in `app/(site)/layout.tsx`.
  - Backoffice routes in `app/backoffice/*` with guarded shell in `app/backoffice/layout.tsx` and `components/backoffice/layout/backoffice-shell.tsx`.
  - Next route handlers in `app/api/*`: `auth/*` and the `proxy/[...path]`
    passthrough. Nothing else: the backoffice reaches every Django resource,
    site settings, labels and pages included, through the proxy.
- Request-level logic lives in **`proxy.ts`** — Next.js 16's rename of
  `middleware.ts`; there is no `middleware.ts`. It builds the per-request CSP
  nonce and redirects `/backoffice` requests without an auth cookie to
  `/login`. It reads no site configuration.
- Gates and not-found are decided in a **layout, above the route's
  `loading.tsx`**, with `requireSection` and `requireFound` from
  `lib/route-gates.ts`. A page under a loading boundary that calls `notFound()`
  or `redirect()` does so after the skeleton has streamed with a 200. Each
  switchable section (search, collection, lightbox, compare, the three
  publication kinds) 404s itself from its layout; the detail routes look their
  record up in a layout through a loader wrapped in React's `cache()`, which
  the page reuses. Search has no route-level `loading.tsx`, since its category
  redirect needs the category, which only the page sees.
- Site settings and labels (`readSiteFeatures`, `readModelLabels`) are read
  fresh on every request, never from Next's data cache, and shared within it
  through `cache()`.
- Root providers are composed in `app/layout.tsx`:
  - next-intl messages, auth, site features, model labels, query provider,
    collection, and search context.
- UI strings go through next-intl: catalogues in `messages/{en,de,fr}.json`,
  locale from a cookie (`lib/i18n.ts`). `lib/i18n-messages.test.ts` fails when a
  key exists in one locale but not the others.
- Data access patterns:
  - `lib/api-fetch.ts`: `apiFetch` (anonymous; server-side calls use
    `INTERNAL_API_URL` when set), `authFetch` (server code, with the token from
    `getServerAuthToken()`), `proxyFetch` (browser code, through
    `/api/proxy/*`), and `optionalAuthFetch`.
  - `services/backoffice/api-client.ts` (`backofficeGet`/`Post`/`Put`/`Patch`/`Delete`,
    all through `proxyFetch`) and `crud-factory.ts` (`createCrudService`) back
    the other `services/backoffice/*` modules.
  - Backoffice query keys come from the factory in `lib/backoffice/query-keys.ts`.
- State:
  - React contexts in `contexts/*`.
  - Zustand stores in `stores/*`: `lightbox-store.ts`, `compare-store.ts`,
    `locale-store.ts`.
  - Dexie persistence for lightbox data in `lib/lightbox-db.ts`.
- Auth:
  - The token lives in an HttpOnly cookie that browser code can't read. Login,
    logout and profile go through the Next routes `app/api/auth/*`, which set
    and clear it; other authenticated browser calls go through `/api/proxy/*`
    (`proxyFetch`). "Signed in" on the client is `useAuth().isAuthenticated`,
    i.e. `/api/auth/me` returned a profile.
  - ESLint rejects `document.cookie` and `Authorization` headers in browser
    code (`eslint.config.mjs`).
  - Every write to an `app/api/*` route handler gets a 403 unless the browser
    marks it same-origin (`lib/same-origin.ts`). A dev server opened over plain
    HTTP from another address (`http://192.168.x.x:3000`) therefore refuses
    every write, sign-in included.
  - Role checks read the profile's `capabilities` (`annotate`,
    `annotate_editorially`, `read_drafts`, `manage`), which Django derives from
    the same predicates its permissions use. Nothing gates on the signed-in
    user's `is_staff` or `is_superuser` directly; the users page edits them as
    data.
  - Three checks guard the backoffice, at three layers, and only the last is the
    security boundary: `proxy.ts` checks that the auth cookie _exists_;
    `BackofficeShell` checks `capabilities.manage` client-side; the backend's
    management viewsets require **`is_superuser`**, the rule `manage` reports.

## Frontend Commands (run in this directory)

Preferred (containerised — each runs inside the dev container):

- `just up` / `just up-bg` / `just down`
- `just lint` · `just lint-fix` · `just format` · `just format-fix`
- `just test` · `just test-watch`
- `just build` · `just analyze` · `just build-image` · `just install`
- `just bundle-budget` · `just bundle-budget-update` · `just bash`

> **CI** (`.github/workflows/ci.yml`) runs four jobs: `lint`, `format`
> (`prettier --check .`, which covers Markdown and JSON too), `test` (Vitest),
> and `build`, which runs `next build`, then the bundle budget, then Lighthouse
> (`lighthouserc.json`; an accessibility score below 0.9 fails). The opt-in
> pre-commit hook (`git config core.hooksPath .githooks`) runs only lint and
> format.

> **`just bundle-budget` is a CI gate.** `scripts/check-bundle-budget.mjs` fails
> the build when the total gzip bundle exceeds `.bundle-budget.json`
> (last-measured × 1.1), so adding a route or feature can break CI even when
> lint, tsc and tests pass. For intentional growth: `just bundle-budget-update`,
> then commit the refreshed budget file.

> **Test environments are picked by file name** (`vitest.config.ts`).
> `*.test.ts` runs in plain Node; `*.test.tsx` and `hooks/**` tests run in
> jsdom under `pool: 'vmThreads'`. A `.ts` test outside `hooks/` that needs a
> DOM must start with `/** @vitest-environment jsdom */`.

Host-native equivalents:

- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm lint` · `pnpm lint:fix` · `pnpm format` · `pnpm format:fix`
- `pnpm test` · `pnpm test:watch`
- `pnpm analyze` · `pnpm bundle-budget` · `pnpm bundle-budget:update` (after
  `pnpm build`) · `pnpm lhci`

## Required Environment

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_IIIF_UPSTREAM`
- `NEXT_PUBLIC_SITE_URL`
- `CORS_ALLOWED_ORIGINS`
- `INTERNAL_API_URL` (optional) — the API URL for server-side fetches; falls
  back to `NEXT_PUBLIC_API_URL`. `compose.yml` sets it to
  `host.docker.internal`.

Notes:

- `NEXT_PUBLIC_API_URL` should not include a trailing slash.
- Missing required env values will fail startup: `next.config.mjs` checks all
  four, `lib/env.ts` the three URLs.
- `next.config.mjs` rewrites `/iiif-proxy/*` to `NEXT_PUBLIC_IIIF_UPSTREAM`,
  and `/media/*` to the API when the site and API origins differ.

## Backend Coordination

- `compose.yml` targets `api/compose.yaml`: API on `http://localhost:8000`, SIPI on port 8182.
- `infrastructure/compose.yaml` runs its own frontend container, with traffic routed through nginx (`http://localhost` / `https://localhost` depending on setup).
- Keep `NEXT_PUBLIC_API_URL` aligned with whichever backend runtime mode is active.
