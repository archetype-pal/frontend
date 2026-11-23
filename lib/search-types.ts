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
export type FacetRenderType = 'checkbox' | 'toggle' | 'range' | 'number-select' | 'tree';

type SearchFacetConfig = {
  key: string;
  render: FacetRenderType;
  dateField?: string;
  offByDefault?: boolean;
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
      'Locus',
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
      { key: 'script', render: 'checkbox' },
      { key: 'material', render: 'checkbox' },
      { key: 'deco_type', render: 'checkbox' },
      { key: 'seal_type', render: 'checkbox' },
      { key: 'seal_material', render: 'checkbox' },
      { key: 'origin_place', render: 'checkbox' },
    ],
  },
  images: {
    label: 'Images',
    apiPath: 'item-images',
    defaultVisibleColumns: [
      'Repository City',
      'Repository',
      'Shelfmark',
      'Doc. Type',
      'Thumbnail',
      'Annotations',
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
      { key: 'tags', render: 'checkbox' },
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
      'Character',
      'Hand Name',
      'Thumbnail',
    ],
    facets: [
      { key: 'hand_date', render: 'range', dateField: 'hand_date', offByDefault: true },
      { key: 'character', render: 'checkbox' },
      { key: 'character_type', render: 'checkbox' },
      { key: 'allograph', render: 'checkbox' },
      { key: 'place', render: 'checkbox' },
      { key: 'repository_name', render: 'checkbox' },
      { key: 'repository_city', render: 'checkbox' },
      { key: 'features', render: 'checkbox' },
      { key: 'components', render: 'checkbox' },
      { key: 'component_features', render: 'tree' },
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
      'Place Type',
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

function facetsOf(resultType: ResultType): readonly SearchFacetConfig[] {
  return SEARCH_RESULT_CONFIG[resultType].facets;
}

export function getDefaultVisibleFacets(resultType: ResultType): string[] {
  return facetsOf(resultType)
    .filter((facet) => !facet.offByDefault)
    .map((facet) => facet.key);
}

export type DateFacet = { key: string; field: string; offByDefault: boolean };

export function getDateFacet(resultType: string | undefined): DateFacet | undefined {
  if (!(SEARCH_RESULT_TYPES as readonly string[]).includes(resultType ?? '')) return undefined;
  const facet = facetsOf(resultType as ResultType).find(({ render }) => render === 'range');
  if (!facet) return undefined;
  return {
    key: facet.key,
    field: facet.dateField ?? 'date',
    offByDefault: facet.offByDefault ?? false,
  };
}

export const DATE_FIELDS: readonly string[] = [
  'date',
  ...SEARCH_RESULT_TYPES.flatMap((type) =>
    facetsOf(type).flatMap(({ dateField }) => (dateField ? [dateField] : []))
  ),
];

export function getFacetRenderMap(resultType: ResultType): Record<string, FacetRenderType> {
  return Object.fromEntries(
    SEARCH_RESULT_CONFIG[resultType].facets.map((facet) => [facet.key, facet.render])
  ) as Record<string, FacetRenderType>;
}

export function getDefaultVisibleColumns(resultType: ResultType): readonly string[] {
  return SEARCH_RESULT_CONFIG[resultType].defaultVisibleColumns;
}

const COLUMN_LABELS: Partial<Record<ResultType, Record<string, string>>> = {
  hands: { Date: 'Hand Date' },
};

export function getColumnLabel(resultType: ResultType, column: string): string {
  return COLUMN_LABELS[resultType]?.[column] ?? column;
}

export const resultTypeItems = SEARCH_RESULT_TYPES.map((value) => ({
  label: SEARCH_RESULT_CONFIG[value].label,
  value,
})) as { label: string; value: ResultType }[];
