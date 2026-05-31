# Search UI — Proposal for the Next Iteration

_Status: proposal / input for the next revamp. Written 2026‑05‑31 after the
scriptorial reskin + clutter‑removal passes._

## Where we are now

Two passes have already landed:

1. **Scriptorial reskin** — the search surfaces now use the warm‑academic tokens
   (parchment surfaces, ink text, deep‑blue structure, gold accent), a Cormorant
   result‑count numeral, gold‑underlined serif type tabs, a low‑chrome parchment
   filter rail, framed grid cards with always‑on titles, and editorial
   empty/loading states.
2. **Clutter removal** — dropped Compare, Share‑link, the "Search in" / per‑row
   "View" cross‑type links, and the redundant Sort action; pagination now shows
   only on list views; the count label is just "_N_ results"; the "FILTERS"
   heading is gone.

The result is cohesive and calm, but it is still fundamentally **the old
information architecture, repainted**. The next iteration should change the
_structure_, not the skin. This document is the brief for that.

## Guiding principles

1. **The image is the subject.** This is a palaeography corpus. A folio
   thumbnail communicates more than any metadata column. Imagery should be
   first‑class in every view, including the table.
2. **One search box, and make it obvious.** Today a keyword can be typed in the
   global nav _and_ in the filter rail — two inputs, two mental models.
3. **Progressive disclosure.** Show the few controls people use constantly;
   tuck the rest behind one affordance. The rail currently shows every facet,
   fully expanded, all the time.
4. **Views are peers, not a hidden menu.** Table / Grid / Timeline / Map are
   different lenses on the same query and deserve a visible switch.
5. **Stay on the tokens.** Everything below assumes the existing design
   language (see `project_search_design_language` memory): no new palette, gold
   = active, Cormorant for display, serif for titles.

## The problems, ranked

### P1 — Two competing search boxes

The global header has "Enter search"; the filter rail has a "Keyword" input.
A first‑time user can't tell which is "the" search, and the relationship between
them (the header one navigates to `/search`, the rail one filters in place) is
invisible.

> **Proposal:** a single, prominent **search field that lives in the search
> sub‑header**, spanning the width between the result count and the actions.
> On the search page the global‑nav search collapses to an icon (or hides),
> so there is exactly one obvious place to type. The rail keeps facet‑specific
> "search within this facet" boxes only.

### P2 — View switching is hidden in a menu

Grid/Timeline/Map/Charts live inside the "Actions" dropdown. Most users never
discover the grid — the most attractive view for this corpus.

> **Proposal:** a visible **segmented view‑switcher** (icons: list, grid,
> timeline, map, chart) sitting on the right of the sub‑header. Disabled
> segments grey out per result type (the logic already exists in
> `use-search-view-mode`). The Actions menu then only holds Saved searches,
> Advanced search, and Export.

### P3 — The table buries identity and imagery

For manuscripts the columns lead **Repository City → Repository → Shelfmark →
…**, and there is _no thumbnail at all_. The shelfmark (the thing scholars cite)
is third, and the picture — the most recognisable signal — is absent.

> **Proposal:** redesign the row as an **identity‑first media row**: a small
> folio thumbnail + shelfmark (serif, prominent) + a secondary line of
> repository/date/type, then the remaining metadata as lighter trailing
> columns. Think "search result", not "spreadsheet". Keep the dense spreadsheet
> as an opt‑in "compact" density for researchers (the `FieldVisibilityMenu`
> already gates researcher features).

### P4 — The filter rail is one long, undifferentiated scroll

Images expose 9 facets, all expanded. Finding the one you want means scrolling
past the rest. There's no notion of "primary" vs "secondary" filters.

> **Proposal:**
>
> - Show the **2–3 highest‑value facets expanded** (e.g. Repository, Date,
>   Document type), the rest **collapsed by default**.
> - Add a small **"filter finder"** input at the top of the rail that filters
>   the list of facets (not their values) when there are many.
> - Treat **Date** as a first‑class control (a compact range slider pinned near
>   the top), since nearly every query in this corpus is time‑scoped.

### P5 — There is no guided entry / landing

Arriving at `/search` drops you straight into "all 714 in a table". There's no
on‑ramp: no featured collections, no "browse by repository / century / hand",
no sense of the corpus's shape.

> **Proposal:** a **zero‑query landing state** inside the results area: the big
> search field, a one‑line corpus summary ("714 manuscripts · 1,000 images ·
> 1100–1250"), and a few **browse chips** (top repositories, centuries,
> document types) that seed a filtered search. The existing timeline/map make
> great "browse the shape of the corpus" entry points here.

### P6 — Sorting is table‑only and invisible elsewhere

With the Sort action removed, sorting now happens by clicking column headers —
which only exist in the table. Grid and timeline have no sort.

> **Proposal:** a small **visible "Sort: ▾" control** next to the view switcher
> that works across views (Relevance, Date ↑/↓, Shelfmark, Most images). It maps
> onto the same `ordering.options` the server already returns.

### P7 — Active‑filter feedback is weak

After clicking a facet, the only confirmation is a chip inside the rail (which
may be scrolled off). The result set changes with little fanfare.

> **Proposal:** a **slim sticky "active filters" bar** across the top of the
> results area (not the rail) showing the applied filters as removable gold
> chips, with a "Clear all". This is the natural home for the clear‑all that
> the removed "FILTERS" header used to carry, and it stays visible while
> scrolling results.

### P8 — Mobile is an afterthought

Tabs scroll horizontally; filters are a sheet; the count + tabs + actions
compete for one cramped row.

> **Proposal:** on small screens, collapse the controls to a search field, a
> Filters button (with an active count), and a compact View/Sort control; move
> the type tabs into a select or a scrollable segmented control, and let results
> go full‑width.

## Proposed layout (wireframe)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Models of Authority            [ global nav … ]              [user] [⋯]   │  ← global nav (unchanged)
├──────────────────────────────────────────────────────────────────────────┤
│  714        ┌──────────────────────────────────────┐   ⊞ ☰ ⌗ ◷ ⊙   ⇅ ⋮   │  ← sub-header:
│  results    │ 🔍  Search the corpus…               │   view-switch  sort  │     count · ONE search ·
│             └──────────────────────────────────────┘   (segmented)  actions│     view · sort · actions
│  ── Manuscripts · Images · Hands · Graphs · Texts · … (gold underline) ──   │  ← type tabs
├───────────────┬──────────────────────────────────────────────────────────┤
│  Date  ▸▭▭▭◂  │  [ Repository: Durham ✕ ]  [ 1150–1200 ✕ ]   Clear all     │  ← sticky active-filters bar
│  Repository ▾ │ ┌────────────────────────────────────────────────────────┐│
│  Doc type   ▾ │ │  🖼  DCD 1.2.Reg   · Durham · 1189 · Charter            ││  ← identity-first media rows
│  ───────────  │ │  🖼  DCD 2.1.Pap   · Durham · 1201 · Brieve             ││     (thumbnail + shelfmark +
│  + more       │ │  🖼  NRS GD55/2    · Edinburgh · 1142 · Charter         ││      meta), or grid of cards
│  filters      │ │  …                                                      ││
│               │ └────────────────────────────────────────────────────────┘│
│               │                         ‹ 1 2 3 … ›                        │
└───────────────┴──────────────────────────────────────────────────────────┘
```

## Component‑by‑component notes

| Area               | Now                         | Proposed                                                                    |
| ------------------ | --------------------------- | --------------------------------------------------------------------------- |
| **Search field**   | rail "Keyword" + global nav | one prominent field in the sub‑header; global search collapses on `/search` |
| **Type tabs**      | gold‑underline serif tabs ✓ | keep; make them a `<select>` on mobile                                      |
| **View switch**    | hidden in Actions           | visible segmented control (list/grid/timeline/map/chart)                    |
| **Sort**           | column headers only         | visible cross‑view "Sort ▾"                                                 |
| **Active filters** | chips in rail               | sticky chips bar above results + Clear all                                  |
| **Filter rail**    | all facets expanded         | top 2–3 expanded, rest collapsed; facet‑finder; Date pinned                 |
| **Table**          | spreadsheet, no image       | identity‑first media rows; spreadsheet as opt‑in density                    |
| **Grid**           | framed cards ✓              | keep; add the same media‑row data (date/type) under title                   |
| **Landing**        | none (table of all)         | zero‑query state: search + corpus summary + browse chips                    |
| **Empty state**    | scriptorial ✓               | keep                                                                        |

## Suggested phasing

- **Phase 1 (high value, low risk):** visible view‑switcher + cross‑view sort
  (move out of Actions); sticky active‑filters bar; collapse secondary facets by
  default. These are re‑arrangements of existing data/handlers.
- **Phase 2:** unify the search box (sub‑header field; collapse global search on
  `/search`); pin Date to the top of the rail.
- **Phase 3 (bigger):** identity‑first media table rows; the zero‑query landing
  state with browse chips. These touch `results-table.tsx` structure and add a
  new landing component, so they warrant their own design + tests.

## What to preserve

Everything from the two completed passes: the token‑based scriptorial look, the
Cormorant count, the gold‑active idiom, the framed grid cards, and the
editorial empty/loading states. This proposal **re‑arranges and enriches**; it
does not repaint.
