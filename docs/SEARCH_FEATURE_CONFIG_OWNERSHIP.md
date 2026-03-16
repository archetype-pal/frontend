# Search Feature Config Ownership

## Canonical Source Of Truth

The canonical defaults for search category visibility and presentation are defined in:

- `lib/search-types.ts` (`SEARCH_RESULT_CONFIG`, `getDefaultVisibleColumns()`)
- `lib/site-features.ts` (`getDefaultConfig()` consumes derived defaults)
- `lib/search-types.ts` (`getFilterOrder()`, `getFilterRenderMap()`)

`config/site-features.json` is an environment/runtime override layer and should only contain values
that intentionally differ from canonical defaults.

## Ownership Rules

- Add new search category defaults in TypeScript first (`search-types.ts`, `site-features.ts`).
- Keep `site-features.json` minimal and explicit; do not copy full defaults unless required.
- When changing default columns/facets, update both TS defaults and any corresponding runtime
  overrides.

## Validation Checklist

For any search config change:

- `pnpm lint`
- `pnpm run format`
- `pnpm run check:pr-template`
- `pnpm build`
- `pnpm test`

Manual checks:

- Verify `search/[type]` pages render with expected visible columns/facets.
- Verify disabled sections and disabled categories route to not-found as expected.
