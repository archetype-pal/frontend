# Technical Issues Analysis & Remediation Plan

**Project:** Archetype Frontend (Next.js 16, React 19)  
**Analysis date:** February 2025 (updated February 2026)

---

## Executive Summary

The codebase is in good shape: **ESLint**, **TypeScript**, **Vitest**, and **Prettier** pass; the production build succeeds. A first pass of remediation was completed in February 2026: security bumps (jspdf, overrides), Node engine and CI alignment, accessibility page and link standardization, loading/error UX, env consistency, API error differentiation, instrumentation gating, alt text, and config/docs comments. This document lists the original technical issues and what was done; items not yet implemented (CSP tightening, expanded tests, optional middleware) remain as future work.

---

## 1. Security

### 1.1 NPM audit vulnerabilities (High priority)

**Current:** `pnpm audit` reports **11 vulnerabilities** (7 high, 3 moderate, 1 low).

| Severity | Package       | Issue / Fix                                                                                                                                                 |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | **jspdf**     | Multiple (PDF injection, DoS, XMP injection, etc.). **Fix:** Upgrade to `jspdf@^4.2.0` (or latest patched).                                                 |
| High     | **minimatch** | ReDoS. **Fix:** Transitive via `@eslint/eslintrc` and `eslint-config-next`; upgrade ESLint/Next or add overrides/resolutions to force `minimatch@>=10.2.1`. |
| Moderate | **ajv**       | ReDoS with `$data`. **Fix:** Transitive via `@eslint/eslintrc`; same as minimatch.                                                                          |
| Low      | **qs**        | DoS (arrayLimit). **Fix:** Transitive via `@annotorious/react` → pixi.js; upgrade annotorious or add override for `qs@>=6.14.2` if possible.                |

**Remediation:**

1. **jspdf:** Bump in `package.json` to `"jspdf": "^4.2.0"` (or latest 4.x), run `pnpm install`, then `pnpm audit` to confirm.
2. **Transitive (minimatch, ajv, qs):** Add `pnpm.overrides` (or `resolutions`) for the patched versions; re-run audit and tests.

**Status:** Done. jspdf upgraded to `^4.2.0`; `overrides` added for `minimatch@^10.2.1`, `ajv@^8.18.0`, `qs@^6.14.2`. Some audit findings may remain until parent packages (e.g. eslint-config-next) depend on patched versions.

### 1.2 Content-Security-Policy (Medium priority)

**Current:** `next.config.mjs` sets CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, which weakens XSS protection.

**Remediation:**

- Prefer nonces or hashes for inline scripts and avoid `'unsafe-eval'` where possible.
- If third-party or legacy code requires it short-term, document the risk and plan a follow-up to tighten CSP (e.g. Next.js script strategy, moving inline logic to external chunks).

**Status:** TODO added in `next.config.mjs`; full CSP tightening (nonces/hashes) deferred.

### 1.3 API route auth (Low / informational)

**Current:** `/api/site-features` GET is public; PUT requires `Authorization: Token <token>` and server-side staff check. No middleware protects backoffice routes at the edge.

**Remediation:** Optional: add Next.js middleware to redirect unauthenticated users from `/backoffice` (or return 401 for API) for defense in depth. Current server-side checks are sufficient for the single API route.

---

## 2. Broken links & routing

### 2.0 Accessibility Statement 404 (High priority)

**Current:** The app links to an “Accessibility Statement” from multiple places, but **no such route exists**, so all links 404.

- **Header:** `Link href="/about/accessibility"` (in dropdown).
- **Footer:** `Link href="/accessibility"`.
- **About pages:** `Link href="/accessibility"` (historical-context, about-models-of-authority).

There is no `app/accessibility/page.tsx` or `app/about/accessibility/page.tsx`.

**Remediation:**

1. Create either `app/accessibility/page.tsx` or `app/about/accessibility/page.tsx` with the actual Accessibility Statement content.
2. Standardize all links to the same path (e.g. `/about/accessibility`) and update footer and about pages to use it so one canonical URL is used everywhere.

**Status:** Done. `app/about/accessibility/page.tsx` created with statement content; footer and about pages now link to `/about/accessibility`.

---

## 3. Environment & Node

### 3.1 Node engine warning (Medium priority)

**Current:** `package.json` has `"engines": { "node": ">=25.0.0" }`. On Node 23.x you get:

`Unsupported engine: wanted: {"node":">=25.0.0"} (current: {"node":"v23.11.0","pnpm":"10.30.1"})`

Node 25 is “Current” (not LTS); Node 24 is Active LTS.

**Remediation:**

- If the app does not rely on Node 25–specific features, relax to e.g. `">=20.0.0"` or `">=22.0.0"` to align with LTS and avoid warnings on Node 23/24.
- If you must require Node 25, document it in README and ensure CI uses Node 25.

**Status:** Done. `engines.node` set to `>=22.0.0`; CI workflow uses Node 22.

### 3.2 Env and API base URL consistency (Low priority)

**Current:** `app/api/site-features/route.ts` uses `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'` instead of the shared `env` from `@/lib/env`.

**Remediation:** Import `env` from `@/lib/env` and use `env.apiUrl` so the API base URL is defined in one place.

**Status:** Done. `app/api/site-features/route.ts` now uses `env.apiUrl`.

---

## 4. Code quality & ESLint

### 4.1 eslint-disable usage (Medium priority)

**Current:** Many files use:

- `react-hooks/set-state-in-effect` (syncing server/prop data to local state in `useEffect`).
- `react-hooks/exhaustive-deps` (intentional dependency omissions).
- `@next/next/no-img-element` (raw `<img>` where Next Image is not used).
- `react-hooks/incompatible-library` in `data-table.tsx` (likely React Table + React 19).

**Remediation:**

1. **set-state-in-effect:** Where possible, derive state from props/query data instead of syncing in an effect (e.g. `const [local, setLocal] = useState(server);` and only call `setLocal` in response to user actions). Where effect sync is intentional, keep the disable but add a one-line comment (e.g. “Sync server config to local form state”).
2. **exhaustive-deps:** Prefer including the real deps or using refs; where omission is intentional, document why.
3. **no-img-element:** Keep disables only where necessary (e.g. IIIF/OpenSeadragon, dynamic or external URLs that can’t use `next/image`). For backoffice preview/upload, consider `next/image` with `unoptimized` if acceptable.
4. **incompatible-library:** Confirm compatibility of `@tanstack/react-table` with React 19; update or wait for a fix and keep the disable until then.

**Status:** Comment added in `data-table.tsx` documenting the intentional disable for @tanstack/react-table + React 19.

---

## 5. Performance & Next.js config

### 5.1 Image optimization disabled globally (Low–Medium priority)

**Current:** `next.config.mjs` has `images: { ..., unoptimized: true }`. Many components also pass `unoptimized` to `next/image`.

**Remediation:**

- If IIIF/external image servers require it, keep `unoptimized` only for those remote patterns and remove the global flag so other images (e.g. static assets, same-origin media) can be optimized.
- If every image must stay unoptimized, document the reason (e.g. “IIIF and external URLs only”) and consider removing the global override if it’s redundant with per-component `unoptimized`.

**Status:** Comment added in `next.config.mjs` documenting that IIIF/external require unoptimized.

### 5.2 Build warning: Type Stripping (Low priority)

**Current:** Build logs: `(node:...) ExperimentalWarning: Type Stripping is an experimental feature...`

**Remediation:** Track Next.js/TypeScript release notes; no code change required unless you need to disable the feature via config.

---

## 6. User experience (loading & error states)

### 6.1 Missing loading.tsx (Medium priority)

**Current:** Many dynamic routes have no `loading.tsx`, so users may see a blank or stalled screen while data loads.

**Routes with loading:**  
`search`, `scribes/[id]`, `news`, `news/[slug]`, `manuscripts/[id]`, `hands/[id]`, `feature`, `feature/[slug]`, `blogs`, `blogs/[slug]`.

**Routes without loading (candidates):**

- `digipal/[id]`
- `manuscripts/[id]/images/[imageId]`
- `collection`, `dashboard`, `login`
- All **backoffice** routes (layout or key pages)
- `about/historical-context`, `about/about-models-of-authority`
- `events/exhibition`, `events/exhibition-launch`, `events/conference`, `events/colloquium`

**Remediation:** Add a `loading.tsx` (skeleton or spinner) for:

1. `digipal/[id]`, `manuscripts/[id]/images/[imageId]`
2. Backoffice layout or high-traffic backoffice pages
3. About and events pages if they do async work

Reuse existing loading patterns from e.g. `app/blogs/[slug]/loading.tsx` or `app/manuscripts/[id]/loading.tsx`.

**Status:** Done. Added `loading.tsx` for: `digipal/[id]`, `manuscripts/[id]/images/[imageId]`, `backoffice`, `about/accessibility`, `about/historical-context`, `about/about-models-of-authority`, and all four events routes (exhibition, exhibition-launch, conference, colloquium).

### 6.2 Error boundaries (Low priority)

**Current:** Root `error.tsx` and `digipal/[id]/error.tsx` exist; lightbox and backoffice use custom error boundaries. Deeper segments (e.g. manuscripts, hands, scribes) rely on `notFound()` and root error.

**Remediation:** Optional: add segment-level `error.tsx` for heavy routes (e.g. `manuscripts/[id]`, `hands/[id]`) to show a contextual “Something went wrong” and retry instead of the root error UI.

**Status:** Done. Added `app/manuscripts/[id]/error.tsx` and `app/hands/[id]/error.tsx` with contextual copy and back links.

### 6.3 Missing global-error.tsx (Low priority)

**Current:** Next.js supports a root `app/global-error.tsx` that catches errors in the root layout. Only `app/error.tsx` exists for route-level errors. If the root layout throws, users may see a blank or browser error page.

**Remediation:** Add `app/global-error.tsx` with a minimal UI (no dependency on layout/components) that shows a generic "Something went wrong" and reload link.

**Status:** Done. `app/global-error.tsx` added with minimal inline HTML/body, “Try again” and “Back to home”.

---

## 7. Accessibility

### 7.1 Broken Accessibility Statement links (High priority)

**Current:** Header links to `/about/accessibility`, footer and about pages to `/accessibility`. Neither route exists (no `app/accessibility/page.tsx` or `app/about/accessibility/page.tsx`), so all links 404.

**Remediation:** (1) Create the page at one canonical path (e.g. `app/about/accessibility/page.tsx`). (2) Standardize all links to that path.

**Status:** Done. See §2.0.

### 7.2 Empty or generic alt text (Low priority)

**Current:** `ManuscriptViewer.tsx` uses `<img alt="">` for thumbnails; events pages reuse the same alt for different images. Use descriptive alt for content images.

**Remediation:** Use descriptive `alt` (e.g. locus/shelfmark) for manuscript thumbnails; keep `alt=""` only for decorative images.

**Status:** Done. ManuscriptViewer annotation thumbnails now use `alt={\`Annotation thumbnail: ${a.id}\`}`.

---

## 8. API & backend contract

### 8.1 Site-features API error responses (Low priority)

**Current:** PUT `/api/site-features` returns 400 for both invalid JSON and invalid config shape.

**Remediation:** Differentiate: e.g. 400 for “Invalid config shape” and 415 or 400 with a distinct message for “Invalid JSON body” to simplify client handling and debugging.

**Status:** Done. PUT now returns 400 with `{ error: 'Invalid JSON body' }` on parse failure and 400 with `{ error: 'Invalid config shape' }` when `sections` or `searchCategories` are missing.

---

## 9. Testing & instrumentation

### 9.1 Test coverage (Medium priority)

**Current:** Only `lib/sanitize-html.test.ts` is present; one test file, five tests.

**Remediation:**

- Add unit tests for critical libs: `lib/api-fetch.ts`, `lib/env.ts`, `lib/sanitize-html.ts` (expand), and key utils (e.g. `lib/lightbox-params.ts`, `lib/filter-config.ts`).
- Add a few integration tests for important UI flows (e.g. search, collection, backoffice login/save) using Vitest + React Testing Library or Playwright for E2E.

### 9.2 Instrumentation logging (Low priority)

**Current:** `instrumentation.ts` logs API URL and Node env at server startup.

**Remediation:** Gate verbose logs to `NODE_ENV === 'development'` or remove in production to avoid leaking configuration in logs.

**Status:** Done. `instrumentation.ts` startup logs are wrapped in `if (process.env.NODE_ENV === 'development')`.

---

## 10. Formatting & logging

### 10.1 Prettier (Immediate)

**Current:** `pnpm run format` fails on `docs/TECHNICAL_ISSUES_AND_REMEDIATION.md`.

**Remediation:** Run `pnpm run format:fix` to fix the doc, or add the file to Prettier ignore if docs are intentionally unformatted.

**Status:** Done. Format applied; CI format check passes.

### 10.2 Console in production (Low priority)

**Current:** `lib/api-fetch.ts` logs every request in development (`console.log` / `console.error`); instrumentation logs at startup. No risk if already gated by `NODE_ENV`, but ensure no `console.*` in production code paths for sensitive data.

**Remediation:** Keep API logging behind `NODE_ENV === 'development'` (already done in api-fetch); gate instrumentation startup logs to development (see 9.2).

---

## 11. Remediation plan (prioritized)

| Priority | Item                       | Action                                                                                                    | Status     |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| P0       | jspdf vulnerabilities      | Upgrade `jspdf` to `^4.2.0` (or latest 4.x) and run `pnpm audit`.                                         | Done       |
| P0       | Transitive vulnerabilities | Add pnpm overrides for minimatch, ajv, qs to patched versions; run audit and tests.                       | Done       |
| P1       | Node engine                | Relax to `>=20.0.0` or `>=22.0.0` (or document Node 25 requirement and fix CI).                           | Done       |
| P1       | CSP                        | Plan to remove or reduce `unsafe-inline` / `unsafe-eval`; implement nonces/hashes if needed.              | TODO       |
| P1       | Loading UX                 | Add `loading.tsx` for digipal, manuscripts/images, and backoffice (and optionally about/events).          | Done       |
| P2       | Env consistency            | Use `env.apiUrl` in `app/api/site-features/route.ts`.                                                     | Done       |
| P2       | ESLint disables            | Refactor or document set-state-in-effect and exhaustive-deps; restrict no-img-element to necessary cases. | Partial    |
| P2       | Tests                      | Add unit tests for lib and a few integration/E2E tests for main flows.                                    | Pending    |
| P2       | Images                     | Scope `unoptimized` to IIIF/external only if feasible; document if global flag must stay.                 | Documented |
| P3       | API 400 differentiation    | Return distinct status/messages for invalid JSON vs invalid config in site-features PUT.                  | Done       |
| P3       | Segment error boundaries   | Add `error.tsx` for manuscripts/[id], hands/[id] if desired.                                              | Done       |
| P3       | Instrumentation            | Gate or remove startup logs in production.                                                                | Done       |
| P1       | Accessibility 404          | Create accessibility page; standardize links to one URL (e.g. `/about/accessibility`).                    | Done       |
| P2       | Prettier                   | Run `pnpm run format:fix` so CI passes.                                                                   | Done       |
| P3       | global-error.tsx           | Add `app/global-error.tsx` for root layout failures.                                                      | Done       |
| P3       | Alt text                   | Use descriptive alt in ManuscriptViewer thumbnails; improve events images where needed.                   | Done       |

---

## 12. What’s already in good shape

- **Lint / TypeScript / Prettier:** All pass; CI runs lint, format, and build.
- **Build:** Production build completes successfully; static and dynamic routes are correctly classified.
- **next/image:** Most usages provide descriptive `alt`; raw `<img>` is used only where justified (IIIF/OpenSeadragon, carousel preview) with eslint-disable. Annotation thumbnails in ManuscriptViewer use descriptive alt (§7.2).
- **Error handling:** Root, global-error, digipal, manuscripts/[id], and hands/[id] error boundaries exist; key pages use `notFound()` and handle publication-not-found flows.
- **Auth:** Site-features API PUT is protected by Token + server-side staff check; backoffice uses auth context and redirects.
- **No @ts-ignore / @ts-expect-error** in the codebase.

Remaining optional or future work: CSP tightening (nonces/hashes), expanded unit/integration tests, and optional backoffice middleware.
