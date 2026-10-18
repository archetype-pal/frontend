# Search Feature Config Ownership

Search categories (`SEARCH_RESULT_TYPES`: manuscripts, images, scribes, …) are
configured in two layers: code declares what exists, and the backend stores what
each deployment shows.

## What exists — code

- `lib/search-types.ts`: `SEARCH_RESULT_CONFIG` declares each category's label,
  API path, facets (key and render type, in rail order) and default visible
  columns. Read it through `getFacetOrder()`, `getFacetRenderMap()` and
  `getDefaultVisibleColumns()`.
- `components/search/results-table.tsx`: `COLUMN_HEADERS_BY_TYPE` lists every
  column the table can render. Column names in the config are these header
  strings.
- `lib/site-features.ts`: `getDefaultConfig()` builds the full default config
  from the two above, with every category enabled and every facet visible.

## What each deployment shows — backend

The live config is backend-owned: `AppSettings` rows under `site_features.*`,
served at `/api/v1/app-settings/` (`SiteFeaturesView` in
`api/apps/common/views.py`) and edited by superusers at
`/backoffice/site-features`. `readSiteFeatures()` (`lib/site-features-server.ts`)
merges each stored category over `getDefaultConfig()`. When the backend can't be
read it serves the last config it read, or the defaults.

`visibleColumns` and `visibleFacets` are explicit lists: a stored list replaces
the default one. Guests see exactly that list. Signed-in users can hide more
from it in the field-visibility menu, kept in `localStorage`
(`lib/search-visibility.ts`).

## Adding a facet or column

1. Declare it in `lib/search-types.ts` (facet) or `results-table.tsx` (column).
2. Add it on the backend, or no existing deployment will show it until an admin
   ticks it at `/backoffice/site-features`: a data migration that appends it to
   the stored list (`api/apps/common/migrations/0014_append_seal_facets.py` is
   the pattern), plus the seed in `0010_seed_site_features.py` and
   `DEFAULT_SITE_FEATURES` in `apps/common/views.py`, which a backend test keeps
   equal.
3. For a manuscripts facet, also add it to `config/site-features.json`:
   `config/site-features.test.ts` requires that file to list every manuscripts
   facet. The app does not read the file at runtime.

## Checks

- `pnpm lint`, `pnpm format`, `pnpm test` and `pnpm build` (the CI gates).
- `/search/<type>` shows the expected columns and facets, signed out and signed
  in.
- A disabled section rewrites to `/not-found`. `/search`, an unknown category and
  a disabled one redirect to the first enabled category, or to `/not-found` when
  none is enabled (`proxy.ts`).
