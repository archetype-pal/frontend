import {
  getDefaultVisibleColumns,
  getFacetOrder,
  SEARCH_RESULT_TYPES,
  type ResultType,
} from './search-types';

export type SectionKey =
  | 'search'
  | 'collection'
  | 'lightbox'
  | 'news'
  | 'blogs'
  | 'featureArticles'
  | 'events'
  | 'about';

export type SearchCategoryConfig = {
  enabled: boolean;
  visibleColumns: string[];
  visibleFacets: string[];
};

export type SiteFeaturesConfig = {
  sections: Record<SectionKey, boolean>;
  sectionOrder: SectionKey[];
  searchCategories: Record<ResultType, SearchCategoryConfig>;
};

export const ALL_SECTION_KEYS: SectionKey[] = [
  'search',
  'collection',
  'lightbox',
  'news',
  'blogs',
  'featureArticles',
  'events',
  'about',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  search: 'Search',
  collection: 'My Collection',
  lightbox: 'Lightbox',
  news: 'News',
  blogs: 'Blogs',
  featureArticles: 'Feature Articles',
  events: 'Past Events',
  about: 'About',
};

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

  return { sections, sectionOrder: [...ALL_SECTION_KEYS], searchCategories };
}
