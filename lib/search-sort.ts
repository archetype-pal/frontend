/**
 * Sort-field helpers for the search UI's "Sort by" control.
 *
 * The set of sortable fields is per-index and lives on the backend
 * (`registry.py` → `sortable_attributes`), reaching the client through the
 * facets response as `data.ordering.options`. Everything here derives the
 * dropdown from that runtime payload rather than a hardcoded per-type list, so
 * a site can add or drop sort terms by editing the registry alone.
 *
 * Deliberately free of React / next-intl: the label lookup is injected, which
 * keeps the module a plain unit under test.
 */

export type SearchOrdering =
  { current: string; options: Array<{ name: string; text: string; url: string }> } | undefined;

export type SortField = {
  attribute: string;
  label: string;
};

/**
 * Attributes the backend can sort by but a researcher should never see. `id` is
 * Meilisearch's internal default ordering — it carries no meaning in the domain.
 */
export const HIDDEN_SORT_FIELDS = new Set(['id']);

/**
 * Preferred dropdown order. Registry order is an implementation detail, so the
 * list is curated to read the way the legacy Archetype "Sort by" menu did:
 * location first, then shelfmark/locus, then dates, then the scribal fields.
 * Attributes absent from this list sort after it, alphabetically by label.
 */
export const SORT_FIELD_ORDER: string[] = [
  'repository_city',
  'repository_name',
  'shelfmark',
  'locus',
  'date_min',
  'date_max',
  'type',
  'catalogue_numbers',
  'name',
  'allograph',
  'character',
  'character_type',
  'hand_name',
  'scribe',
  'place',
  'text_type',
  'clause_type',
  'person_type',
  'place_type',
  'scriptorium',
  'number_of_images',
  'number_of_annotations',
];

/** `repository_city` → `Repository City`. Fallback when no translation exists. */
export function humanizeSortField(attribute: string): string {
  return attribute
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Reduce any of the shapes a sort attribute reaches us in to the canonical
 * attribute name the backend index actually declares.
 *
 * Two conventions collide here: `ordering` values carry a leading `-` for
 * descending, and table columns declare their `sortKey` in the `_exact` form
 * used for filter attributes (`shelfmark_exact`) while the index sorts on the
 * bare name (`shelfmark`). Canonicalising through one function keeps the
 * dropdown, the column headers and the URL parameter on one convention — the
 * mismatch is otherwise invisible until a toggle silently stops toggling.
 */
export function canonicalSortAttribute(name: string): string {
  return name
    .trim()
    .replace(/^-/, '')
    .replace(/_exact$/, '');
}

/**
 * Collapse `ordering.options` (which lists each field twice, asc and desc) into
 * one entry per field, drop the hidden ones, and order for display.
 *
 * `labelFor` resolves an attribute to its human label — callers pass a
 * translation lookup that falls back to {@link humanizeSortField}.
 */
export function buildSortFields(
  ordering: SearchOrdering,
  labelFor: (attribute: string) => string
): SortField[] {
  if (!ordering?.options?.length) return [];

  const seen = new Set<string>();
  const fields: SortField[] = [];
  for (const option of ordering.options) {
    const attribute = canonicalSortAttribute(option?.name ?? '');
    if (!attribute || seen.has(attribute) || HIDDEN_SORT_FIELDS.has(attribute)) continue;
    seen.add(attribute);
    fields.push({ attribute, label: labelFor(attribute) });
  }

  const rankOf = (attribute: string): number => {
    const index = SORT_FIELD_ORDER.indexOf(attribute);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return fields.sort((a, b) => {
    const rankDiff = rankOf(a.attribute) - rankOf(b.attribute);
    if (rankDiff !== 0) return rankDiff;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Split an `ordering` value (`shelfmark` / `-shelfmark` / null) into its parts.
 * The attribute is canonicalised, so a legacy `?ordering=shelfmark_exact` still
 * matches the `shelfmark` entry in the dropdown.
 */
export function parseOrdering(ordering: string | null | undefined): {
  attribute: string | null;
  descending: boolean;
} {
  const raw = ordering?.trim();
  if (!raw) return { attribute: null, descending: false };
  const descending = raw.startsWith('-');
  const attribute = canonicalSortAttribute(raw);
  return attribute ? { attribute, descending } : { attribute: null, descending: false };
}

/** Inverse of {@link parseOrdering}. */
export function formatOrdering(attribute: string, descending: boolean): string {
  return `${descending ? '-' : ''}${attribute}`;
}

/**
 * True only when we can *positively* establish that `value` names an attribute
 * this index refuses to sort on.
 *
 * Used to self-heal an `ordering` that outlived the index it belonged to — a
 * bookmarked `?ordering=scribe` opened on /search/manuscripts, or a field picked
 * while the previous type's list was still on screen. The backend silently drops
 * the unknown attribute, so the UI snaps back to "Relevance" while the URL keeps
 * re-sending it forever.
 *
 * An absent or empty `ordering` block means "don't know yet" (no response, or a
 * failed facets fetch returning EMPTY_SEARCH_RESULT), never "unsupported" —
 * clearing on unknown would wipe a perfectly valid sort.
 */
export function isOrderingUnsupported(
  value: string | null | undefined,
  ordering: SearchOrdering
): boolean {
  if (!ordering?.options?.length) return false;
  const { attribute } = parseOrdering(value);
  if (!attribute) return false;
  return !ordering.options.some(
    (option) => canonicalSortAttribute(option?.name ?? '') === attribute
  );
}
