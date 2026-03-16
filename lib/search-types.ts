export const SEARCH_RESULT_TYPES = [
  'manuscripts',
  'images',
  'scribes',
  'hands',
  'graphs',
  'texts',
  'clauses',
  'people',
  'places',
] as const;
export type ResultType = (typeof SEARCH_RESULT_TYPES)[number];
export type FacetRenderType = 'checkbox' | 'toggle' | 'range' | 'number-select';

export type SearchFacetConfig = {
  key: string;
  render: FacetRenderType;
};

type SearchResultConfigSeed = {
  label: string;
  apiPath: string;
  defaultVisibleColumns: readonly string[];
  facets: readonly SearchFacetConfig[];
};

export type SearchResultConfig = SearchResultConfigSeed;

export const SEARCH_RESULT_CONFIG = {
  manuscripts: {
    label: 'Manuscripts',
    apiPath: 'item-parts',
    defaultVisibleColumns: [
      'Repository City',
      'Repository',
      'Shelfmark',
      'Catalogue Num.',
      'Text Date',
      'Doc. Type',
      'Images',
    ],
    facets: [
      { key: 'image_availability', render: 'toggle' },
      { key: 'text_date', render: 'range' },
      { key: 'format', render: 'checkbox' },
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
    ],
  },
  images: {
    label: 'Images',
    apiPath: 'item-images',
    defaultVisibleColumns: [
      'Repository City',
      'Repository',
      'Shelfmark',
      'Category Number',
      'Doc. Type',
      'Thumbnail',
      'Ann.',
    ],
    facets: [
      { key: 'text_date', render: 'range' },
      { key: 'locus', render: 'checkbox' },
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'features', render: 'checkbox' },
      { key: 'components', render: 'checkbox' },
      { key: 'component_features', render: 'checkbox' },
    ],
  },
  scribes: {
    label: 'Scribes',
    apiPath: 'scribes',
    defaultVisibleColumns: ['Scribe Name', 'Date', 'Scriptorium'],
    facets: [
      { key: 'text_date', render: 'range' },
      { key: 'scriptorium', render: 'checkbox' },
    ],
  },
  hands: {
    label: 'Hands',
    apiPath: 'hands',
    defaultVisibleColumns: [
      'Hand Title',
      'Repository City',
      'Repository',
      'Shelfmark',
      'Place',
      'Date',
      'Catalogue Num.',
    ],
    facets: [
      { key: 'text_date', render: 'range' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'place', render: 'checkbox' },
    ],
  },
  graphs: {
    label: 'Graphs',
    apiPath: 'graphs',
    defaultVisibleColumns: [
      'Repository City',
      'Repository',
      'Shelfmark',
      'Document Date',
      'Allograph',
      'Thumbnail',
    ],
    facets: [
      { key: 'character', render: 'checkbox' },
      { key: 'character_type', render: 'checkbox' },
      { key: 'allograph', render: 'checkbox' },
      { key: 'place', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'features', render: 'checkbox' },
      { key: 'components', render: 'checkbox' },
      { key: 'component_features', render: 'checkbox' },
      { key: 'positions', render: 'checkbox' },
    ],
  },
  texts: {
    label: 'Texts',
    apiPath: 'texts',
    defaultVisibleColumns: ['Repository City', 'Repository', 'Shelfmark', 'Text Type', 'MS Date'],
    facets: [
      { key: 'text_date', render: 'range' },
      { key: 'text_type', render: 'checkbox' },
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'status', render: 'checkbox' },
      { key: 'language', render: 'checkbox' },
      { key: 'places', render: 'checkbox' },
      { key: 'people', render: 'checkbox' },
    ],
  },
  clauses: {
    label: 'Clauses',
    apiPath: 'clauses',
    defaultVisibleColumns: [
      'Cat. Num.',
      'Document Type',
      'Repository City',
      'Repository',
      'Shelfmark',
      'Text Date',
      'Text Type',
      'Clause Type',
    ],
    facets: [
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'text_date', render: 'range' },
      { key: 'text_type', render: 'checkbox' },
      { key: 'clause_type', render: 'checkbox' },
      { key: 'status', render: 'checkbox' },
    ],
  },
  people: {
    label: 'People',
    apiPath: 'people',
    defaultVisibleColumns: [
      'Cat. Num.',
      'Document Type',
      'Repository City',
      'Repository',
      'Shelfmark',
      'Text Date',
      'Text Type',
      'Category',
    ],
    facets: [
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'text_date', render: 'range' },
      { key: 'text_type', render: 'checkbox' },
      { key: 'person_type', render: 'checkbox' },
      { key: 'status', render: 'checkbox' },
    ],
  },
  places: {
    label: 'Places',
    apiPath: 'places',
    defaultVisibleColumns: [
      'Cat. Num.',
      'Document Type',
      'Repository City',
      'Repository',
      'Shelfmark',
      'Text Date',
      'Text Type',
      'Clause Type',
    ],
    facets: [
      { key: 'type', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'text_date', render: 'range' },
      { key: 'text_type', render: 'checkbox' },
      { key: 'place_type', render: 'checkbox' },
      { key: 'status', render: 'checkbox' },
    ],
  },
} as const satisfies Record<ResultType, SearchResultConfig>;

export function getFacetOrder(resultType: ResultType): readonly string[] {
  return SEARCH_RESULT_CONFIG[resultType].facets.map((facet) => facet.key);
}

export function getFacetRenderMap(resultType: ResultType): Record<string, FacetRenderType> {
  return Object.fromEntries(
    SEARCH_RESULT_CONFIG[resultType].facets.map((facet) => [facet.key, facet.render])
  ) as Record<string, FacetRenderType>;
}

export function getDefaultVisibleColumns(resultType: ResultType): readonly string[] {
  return SEARCH_RESULT_CONFIG[resultType].defaultVisibleColumns;
}

export const resultTypeItems = SEARCH_RESULT_TYPES.map((value) => ({
  label: SEARCH_RESULT_CONFIG[value].label,
  value,
})) as { label: string; value: ResultType }[];

/**
 * Cross-type navigation: which result types to show as "also search" links
 * for each result type.
 */
const CROSS_TYPE_LINKS: Record<ResultType, readonly ResultType[]> = {
  manuscripts: ['images', 'hands', 'graphs'],
  images: ['manuscripts', 'hands', 'graphs'],
  hands: ['manuscripts', 'images', 'graphs'],
  graphs: ['manuscripts', 'images', 'hands'],
  scribes: ['hands'],
  texts: ['manuscripts', 'images'],
  clauses: ['manuscripts', 'images', 'texts'],
  people: ['manuscripts', 'images', 'texts'],
  places: ['manuscripts', 'images', 'texts'],
};

export function getCrossTypeLinks(resultType: ResultType): readonly ResultType[] {
  return CROSS_TYPE_LINKS[resultType];
}

/**
 * Per-row cross-type navigation: which result types can be reached from a row
 * by filtering on that row's shelfmark.
 */
const ROW_CROSS_TYPE_TARGETS: Partial<Record<ResultType, readonly ResultType[]>> = {
  manuscripts: ['images', 'hands', 'graphs'],
  hands: ['images', 'graphs'],
  images: ['hands', 'graphs'],
};

export function getRowCrossTypeTargets(resultType: ResultType): readonly ResultType[] | undefined {
  return ROW_CROSS_TYPE_TARGETS[resultType];
}

export function buildShelfmarkFilterUrl(targetType: ResultType, shelfmark: string): string {
  const params = new URLSearchParams();
  params.append('selected_facets', `shelfmark_exact:${shelfmark}`);
  return `/search/${targetType}?${params.toString()}`;
}
