import {
  getDefaultVisibleColumns,
  getFacetOrder,
  SEARCH_RESULT_TYPES,
  type ResultType,
} from './search-types';

export type SectionKey =
  'search' | 'collection' | 'lightbox' | 'news' | 'blogs' | 'featureArticles' | 'events' | 'about';

/**
 * Admin-controlled flags for optional site *features* — as opposed to
 * `SectionKey`, which is a top-level navigation entry (labelled, drag-sortable,
 * routed). A feature flag hides a surface inside pages that keep existing; it
 * never appears in the nav and has no ordering. Add flags to this union (plus
 * `ALL_FEATURE_KEYS` and the two metadata maps below) as more surfaces become
 * optional.
 */
export type FeatureKey = 'manuscriptDescriptions';

export type SearchCategoryConfig = {
  enabled: boolean;
  visibleColumns: string[];
  visibleFacets: string[];
};

export type SiteFeaturesConfig = {
  sections: Record<SectionKey, boolean>;
  sectionOrder: SectionKey[];
  features: Record<FeatureKey, boolean>;
  searchCategories: Record<ResultType, SearchCategoryConfig>;
};

/** Order matters: this is the default nav order, and it must match the backend
 *  seed (`0010_seed_site_features.py`) and `config/site-features.json`. */
export const ALL_SECTION_KEYS: SectionKey[] = [
  'search',
  'lightbox',
  'collection',
  'blogs',
  'featureArticles',
  'about',
  'news',
  'events',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  search: 'Explore',
  collection: 'My Collection',
  lightbox: 'Lightbox',
  news: 'News',
  blogs: 'Blogs',
  featureArticles: 'Feature Articles',
  events: 'Past Events',
  about: 'About',
};

export const ALL_FEATURE_KEYS: FeatureKey[] = ['manuscriptDescriptions'];

/**
 * English source of truth for the flag names, mirroring `SECTION_LABELS`. The
 * admin UI renders the localized `backoffice.siteFeatures.features.*` keys
 * (exactly as the section toggles render `…siteFeatures.sections.*`); these
 * constants keep a locale-independent name next to the key union, and
 * `site-features.test.ts` pins them to the English catalogue so the two copies
 * cannot drift.
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  manuscriptDescriptions: 'Manuscript descriptions (TEI msDesc)',
};

/** One-line "what does this flag actually hide" text, shown under each toggle. */
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  manuscriptDescriptions:
    'Structured TEI descriptions: the description section on public manuscript pages and the msDesc editor in the manuscript workspace. Nothing is deleted — turning this back on restores everything. Search facets are configured separately under Search Categories.',
};

/**
 * Fold an untrusted `features` object (parsed config file, or a PUT payload)
 * onto a base map: only known keys with boolean values are applied, so unknown
 * keys never reach disk and a malformed value can't turn a flag into a string.
 * Anything that isn't a plain object leaves `base` untouched — which is what
 * keeps an omitted `features` key (an older client, or a config file written
 * before the flag existed) from wiping the admin's choices.
 */
export function mergeFeatureFlags(
  base: Record<FeatureKey, boolean>,
  incoming: unknown
): Record<FeatureKey, boolean> {
  const merged = { ...base };
  if (incoming == null || typeof incoming !== 'object' || Array.isArray(incoming)) return merged;
  const source = incoming as Record<string, unknown>;
  for (const key of ALL_FEATURE_KEYS) {
    const value = source[key];
    if (typeof value === 'boolean') merged[key] = value;
  }
  return merged;
}

/**
 * Flags default to ON. A flag is introduced for a feature that already ships,
 * so the default has to reproduce today's behaviour exactly: the surface stays
 * visible on deploy (the persisted config has no `features` key yet) and only
 * disappears when an admin deliberately turns it off.
 */
export function getDefaultFeatures(): Record<FeatureKey, boolean> {
  return Object.fromEntries(ALL_FEATURE_KEYS.map((k) => [k, true])) as Record<FeatureKey, boolean>;
}

export function normalizeSectionOrder(order: readonly SectionKey[] | undefined): SectionKey[] {
  const ordered: SectionKey[] = [];
  const seen = new Set<SectionKey>();

  for (const key of order ?? []) {
    if (ALL_SECTION_KEYS.includes(key) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  for (const key of ALL_SECTION_KEYS) {
    if (!seen.has(key)) {
      ordered.push(key);
    }
  }

  return ordered;
}

const DEFAULT_COLUMNS: Record<ResultType, string[]> = Object.fromEntries(
  SEARCH_RESULT_TYPES.map((type) => [type, [...getDefaultVisibleColumns(type)]])
) as Record<ResultType, string[]>;

export { DEFAULT_COLUMNS };

export function getDefaultConfig(): SiteFeaturesConfig {
  const sections = Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, true])) as Record<
    SectionKey,
    boolean
  >;

  const searchCategories = Object.fromEntries(
    SEARCH_RESULT_TYPES.map((type) => [
      type,
      {
        enabled: true,
        visibleColumns: [...DEFAULT_COLUMNS[type]],
        visibleFacets: [...getFacetOrder(type)],
      },
    ])
  ) as Record<ResultType, SearchCategoryConfig>;

  return {
    sections,
    sectionOrder: [...ALL_SECTION_KEYS],
    features: getDefaultFeatures(),
    searchCategories,
  };
}
