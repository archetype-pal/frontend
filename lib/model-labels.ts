export type ModelLabelKey =
  | 'historicalItem'
  | 'catalogueNumber'
  | 'position'
  | 'date'
  | 'appManuscripts'
  | 'fieldHairType'
  | 'fieldShelfmark'
  | 'fieldDateMinWeight'
  | 'fieldDateMaxWeight'
  // Search result-category tab labels. The "Manuscripts" category reuses
  // `appManuscripts` (it is the site-wide manuscripts label); the rest get
  // their own keys so each search tab can be renamed independently.
  | 'searchCategoryImages'
  | 'searchCategoryScribes'
  | 'searchCategoryHands'
  | 'searchCategoryGraphs'
  | 'searchCategoryTexts'
  | 'searchCategoryClauses'
  | 'searchCategoryPeople'
  | 'searchCategoryPlaces';

export type ModelLabelsConfig = {
  labels: Record<ModelLabelKey, string>;
};

export const DEFAULT_MODEL_LABELS: Record<ModelLabelKey, string> = {
  historicalItem: 'Historical Item',
  catalogueNumber: 'Catalogue Number',
  position: 'Position',
  date: 'Date',
  appManuscripts: 'Manuscripts',
  fieldHairType: 'Hair Type',
  fieldShelfmark: 'Shelfmark',
  fieldDateMinWeight: 'Minimum weight',
  fieldDateMaxWeight: 'Maximum weight',
  searchCategoryImages: 'Images',
  searchCategoryScribes: 'Scribes',
  searchCategoryHands: 'Hands',
  searchCategoryGraphs: 'Graphs',
  searchCategoryTexts: 'Texts',
  searchCategoryClauses: 'Clauses',
  searchCategoryPeople: 'People',
  searchCategoryPlaces: 'Places',
};

export function normalizeModelLabels(
  labels: Partial<Record<ModelLabelKey, unknown>> | undefined
): Record<ModelLabelKey, string> {
  const normalized = { ...DEFAULT_MODEL_LABELS };

  for (const key of Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]) {
    const value = labels?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      normalized[key] = value.trim();
    }
  }

  return normalized;
}

export function getDefaultModelLabelsConfig(): ModelLabelsConfig {
  return {
    labels: { ...DEFAULT_MODEL_LABELS },
  };
}

export function pluralizeLabel(label: string): string {
  // Match the suffix's casing to the character it replaces/follows so an all-caps
  // or stylised label keeps a consistent case (e.g. 'CITY' -> 'CITIES', not 'CITies').
  if (/[^aeiou]y$/i.test(label)) {
    const isUpper = label.slice(-1) === label.slice(-1).toUpperCase();
    return `${label.slice(0, -1)}${isUpper ? 'IES' : 'ies'}`;
  }
  if (/(s|x|z|ch|sh)$/i.test(label)) {
    const isUpper = label.slice(-1) === label.slice(-1).toUpperCase();
    return `${label}${isUpper ? 'ES' : 'es'}`;
  }
  const isUpper = label.length > 0 && label.slice(-1) === label.slice(-1).toUpperCase();
  return `${label}${isUpper ? 'S' : 's'}`;
}
