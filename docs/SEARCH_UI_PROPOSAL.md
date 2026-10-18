# Search UI proposal (2026-05-31) — outcome

A proposal written on 2026-05-31, after the scriptorial reskin and the
clutter-removal pass, to change the search page's structure rather than its
skin. It is kept for one reason: two of its features were built and then
removed on researcher feedback, and one was removed and later restored, which
the code alone does not show. For how search works now, read
`components/search/`, `components/filters/` and `hooks/search/`.

## Problem by problem

Each item gives the problem as it stood in May 2026, what was proposed, and what
happened.

- **P1 — two keyword boxes** (global nav and filter rail). Proposed one field in
  the search sub-header. Shipped as `search-keyword-bar.tsx`; the header search
  hides on `/search` at `lg`. The mobile filter sheet still has its own keyword
  box, the one open unification item.
- **P2 — view switching hidden in the Actions menu.** Proposed a visible
  segmented switcher. Shipped as `view-switcher.tsx`; below `sm` the views stay
  in the Actions menu.
- **P3 — no imagery in the table, shelfmark third.** Proposed identity-first
  media rows (thumbnail, shelfmark, a secondary line), with the spreadsheet as
  an opt-in density. **Built, then removed:** researchers wanted the dense
  spreadsheet (`results-table.tsx`, sticky column header). Imagery came another
  way: Images and Graphs have a Thumbnail column, and text, clause, people and
  place rows carry an inline region preview sized by the S/M/L control.
- **P4 — every facet expanded.** Proposed the top two or three expanded, the
  rest collapsed, a facet finder, and Date pinned. Date is pinned to the top
  (`components/filters/dynamic-facets.tsx`); since October 2026 every panel
  starts collapsed and opens to its full list. There is no facet finder.
- **P5 — no landing state for an empty query.** Proposed a zero-query landing
  with a corpus summary and browse chips. **Built, then removed:** researchers
  want the most room for results and nothing above them.
- **P6 — sorting only by clicking table headers.** Proposed a visible
  cross-view Sort control. **Built, removed** as a redundant second control,
  then **restored** on 2026-07-19 because the grid had no way to sort
  ([frontend#67](https://github.com/archetype-pal/frontend/issues/67)):
  `sort-control.tsx`, with options from the `ordering` block the backend
  returns. Below `sm` it sits in the Actions menu.
- **P7 — weak feedback after applying a filter.** Proposed an active-filters bar
  above the results with Clear all. Shipped as the `ActiveFacetTags` strip in
  `search-page.tsx`.
- **P8 — mobile controls crowd one row.** Filters open in
  `mobile-filter-sheet.tsx` from a button showing the active count; View and
  Sort fold into the Actions menu.

## What still applies

- Researchers prefer the dense table and the most room for results. A control
  that repeats one already on screen, or a panel above the results, reads as
  clutter. A control earns its place when a view lacks the action entirely, as
  sorting did in the grid.
- Stay on the existing design tokens: parchment surfaces, ink text, gold for the
  active state, Cormorant for display numerals, serif titles.
