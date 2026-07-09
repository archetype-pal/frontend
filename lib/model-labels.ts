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
  | 'searchCategoryPlaces'
  // General site branding, shown in the header and footer.
  | 'siteTitle'
  | 'siteTagline'
  | 'footerLine1'
  | 'footerLine2'
  | 'footerBottomLine'
  // Full HTML bodies for the static "About" pages, edited as rich text.
  | 'pageHistoricalContext'
  | 'pageAboutModelsOfAuthority'
  | 'pageAccessibility';

export type ModelLabelLocale = 'en' | 'fr';

export type LocalizedLabel = {
  en: string;
  fr: string;
};

export type ModelLabelsConfig = {
  labels: Record<ModelLabelKey, LocalizedLabel>;
};

// Runtime mirror of ModelLabelKey. A TS union type has no runtime
// representation, so anything that needs to enumerate every key (rather than
// just type-check one) reads this list instead of e.g. Object.keys() on a
// defaults object — there are no hardcoded defaults; the DB SiteLabels
// singleton is the sole source of truth.
export const MODEL_LABEL_KEYS: ModelLabelKey[] = [
  'historicalItem',
  'catalogueNumber',
  'position',
  'date',
  'appManuscripts',
  'fieldHairType',
  'fieldShelfmark',
  'fieldDateMinWeight',
  'fieldDateMaxWeight',
  'searchCategoryImages',
  'searchCategoryScribes',
  'searchCategoryHands',
  'searchCategoryGraphs',
  'searchCategoryTexts',
  'searchCategoryClauses',
  'searchCategoryPeople',
  'searchCategoryPlaces',
  'siteTitle',
  'siteTagline',
  'footerLine1',
  'footerLine2',
  'footerBottomLine',
  'pageHistoricalContext',
  'pageAboutModelsOfAuthority',
  'pageAccessibility',
];

function normalizeLocalizedValue(value: unknown): LocalizedLabel {
  // Pre-i18n config files stored a single string shown to every locale. Seed
  // both languages from it so an existing customization survives the upgrade
  // instead of disappearing for French visitors.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return { en: trimmed, fr: trimmed };
  }

  if (!value || typeof value !== 'object') return { en: '', fr: '' };

  const partial = value as Partial<Record<ModelLabelLocale, unknown>>;
  const en = typeof partial.en === 'string' ? partial.en.trim() : '';
  const fr = typeof partial.fr === 'string' ? partial.fr.trim() : '';
  return { en, fr };
}

export function normalizeModelLabels(
  labels: Partial<Record<ModelLabelKey, unknown>> | undefined
): Record<ModelLabelKey, LocalizedLabel> {
  const normalized = {} as Record<ModelLabelKey, LocalizedLabel>;

  for (const key of MODEL_LABEL_KEYS) {
    normalized[key] = normalizeLocalizedValue(labels?.[key]);
  }

  return normalized;
}

export function getDefaultModelLabelsConfig(): ModelLabelsConfig {
  return {
    labels: Object.fromEntries(
      MODEL_LABEL_KEYS.map((key) => [key, { en: '', fr: '' }])
    ) as Record<ModelLabelKey, LocalizedLabel>,
  };
}

export function resolveModelLabel(label: LocalizedLabel, locale: ModelLabelLocale): string {
  return label[locale] || label.en;
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
