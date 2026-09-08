# Clause timeline — chronological uncertainty

Design options for [frontend#75](https://github.com/archetype-pal/frontend/issues/75).

`use-search-page-state.ts` builds the search timeline from
`facetDistribution.date_min` alone. `date_max` is never read, so a charter dated
`1235 × 1265` is drawn as a spike on 1235. 3,052 of the 5,424 indexed Models of
Authority clauses (56%) carry a range rather than a point.

`mockup.html` is a self-contained page — open it directly in a browser, no build
step — rendering the baseline and three alternatives from the live corpus
(290 distinct datings, 1095–1309).

|                          |                                                          |
| ------------------------ | -------------------------------------------------------- |
| `0-baseline.png`         | Earliest year only — what ships today                    |
| `1-spread.png`           | Option 1 — spread each charter's weight across its range |
| `2-certain-possible.png` | Option 2 — stacked certain / possible per decade         |
| `3-span-ribbons.png`     | Option 3 — one ribbon per distinct dating                |

Two smaller defects in the same view, shown in `summary.png`: 191 undated
clauses (`date_min = 0`) render as a "0s" decade, and the chart is built from a
facet distribution capped at 100 values, silently dropping 163 clauses.
