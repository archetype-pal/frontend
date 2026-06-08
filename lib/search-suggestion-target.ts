import type { ResultType } from '@/lib/search-types';
import type { KeywordSuggestionItem } from '@/components/search/keyword-search-input';

/**
 * Where selecting an autocomplete suggestion should take the user.
 *
 * Server suggestions carry the real entity `id` and a `type` (the search
 * index's URL segment, underscored — e.g. `item_parts`, `scribes`). Best
 * practice (NN/g, Baymard, Algolia/DocSearch, Wikipedia) is that selecting a
 * *specific result* navigates straight to that item, while a plain *query*
 * row runs a search. This resolver encodes that split for Archetype:
 *
 *  - `entity` — the suggestion is a concrete record with its own detail page
 *    (a manuscript / scribe / hand). Open it directly.
 *  - `scoped` — a typed result with no single-id detail route (images, graphs,
 *    texts, clauses, people, places). Route to that type's results tab, where
 *    the row — and for the text-bearing types, the in-context "Text match"
 *    snippet — is shown.
 *  - `search` — a query row (the synthetic "Search all for …", local-pool or
 *    recent-search items, anything untyped). Run a normal keyword search.
 */
export type SuggestionTarget =
  | { kind: 'entity'; href: string }
  | { kind: 'scoped'; resultType: ResultType }
  | { kind: 'search' };

/** Suggestion `type` (index URL segment, underscored) → result-tab ResultType. */
const SEGMENT_TO_RESULT_TYPE: Record<string, ResultType> = {
  item_parts: 'manuscripts',
  item_images: 'images',
  scribes: 'scribes',
  hands: 'hands',
  graphs: 'graphs',
  texts: 'texts',
  clauses: 'clauses',
  people: 'people',
  places: 'places',
};

/** ResultTypes that have a public detail page reachable from the entity id alone. */
const ENTITY_DETAIL_ROUTE: Partial<Record<ResultType, (id: string) => string>> = {
  manuscripts: (id) => `/manuscripts/${id}`,
  scribes: (id) => `/scribes/${id}`,
  hands: (id) => `/hands/${id}`,
};

/** Strip the `type:` prefix the client adds to the suggestion id (`scribes:42` → `42`). */
function entityIdOf(item: KeywordSuggestionItem): string {
  const sep = item.id.indexOf(':');
  return sep >= 0 ? item.id.slice(sep + 1) : item.id;
}

export function resolveSuggestionTarget(item: KeywordSuggestionItem): SuggestionTarget {
  // Untyped (local-pool / recent) or the synthetic "Search all for …" row → search.
  if (!item.type || item.type === 'all') return { kind: 'search' };

  const resultType = SEGMENT_TO_RESULT_TYPE[item.type] ?? (item.type as ResultType);
  const id = entityIdOf(item);

  const detailRoute = ENTITY_DETAIL_ROUTE[resultType];
  if (id && detailRoute) return { kind: 'entity', href: detailRoute(id) };

  return { kind: 'scoped', resultType };
}
