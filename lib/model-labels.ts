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
  | 'footerFunded'
  | 'footerCopyright';

export type ModelLabelLocale = 'en' | 'fr';

export type LocalizedLabel = {
  en: string;
  fr: string;
};

export type ModelLabelsConfig = {
  labels: Record<ModelLabelKey, LocalizedLabel>;
};

export const DEFAULT_MODEL_LABELS: Record<ModelLabelKey, LocalizedLabel> = {
  historicalItem: { en: 'Historical Item', fr: 'Objet historique' },
  catalogueNumber: { en: 'Catalogue Number', fr: 'Numéro de catalogue' },
  position: { en: 'Position', fr: 'Position' },
  date: { en: 'Date', fr: 'Date' },
  appManuscripts: { en: 'Manuscripts', fr: 'Manuscrits' },
  fieldHairType: { en: 'Hair Type', fr: 'Type de poil' },
  fieldShelfmark: { en: 'Shelfmark', fr: 'Cote' },
  fieldDateMinWeight: { en: 'Minimum weight', fr: 'Poids minimum' },
  fieldDateMaxWeight: { en: 'Maximum weight', fr: 'Poids maximum' },
  searchCategoryImages: { en: 'Images', fr: 'Images' },
  searchCategoryScribes: { en: 'Scribes', fr: 'Copistes' },
  searchCategoryHands: { en: 'Hands', fr: 'Mains' },
  searchCategoryGraphs: { en: 'Graphs', fr: 'Graphes' },
  searchCategoryTexts: { en: 'Texts', fr: 'Textes' },
  searchCategoryClauses: { en: 'Clauses', fr: 'Clauses' },
  searchCategoryPeople: { en: 'People', fr: 'Personnes' },
  searchCategoryPlaces: { en: 'Places', fr: 'Lieux' },
  siteTitle: { en: 'Models of Authority', fr: 'Models of Authority' },
  siteTagline: {
    en: 'Scottish Charters and the Emergence of Government, 1100–1250',
    fr: "Les chartes écossaises et l'émergence du gouvernement, 1100–1250",
  },
  footerFunded: {
    en: 'Funded by the Arts and Humanities Research Council (AHRC).',
    fr: 'Financé par le Arts and Humanities Research Council (AHRC).',
  },
  footerCopyright: {
    en: '©2015–17 Models of Authority. Some parts available under CC-BY licence. All manuscript images are copyright of their respective repositories. Website by DDH / KDL. Built with Archetype.',
    fr: '©2015–17 Models of Authority. Certaines parties sont disponibles sous licence CC-BY. Toutes les images de manuscrits sont la propriété de leurs dépôts respectifs. Site web par DDH / KDL. Construit avec Archetype.',
  },
};

function normalizeLocalizedValue(value: unknown, fallback: LocalizedLabel): LocalizedLabel {
  // Pre-i18n config files stored a single string shown to every locale. Seed
  // both languages from it so an existing customization survives the upgrade
  // instead of reverting to the English default for French visitors.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed, fr: trimmed } : fallback;
  }

  if (!value || typeof value !== 'object') return fallback;

  const partial = value as Partial<Record<ModelLabelLocale, unknown>>;
  const en = typeof partial.en === 'string' && partial.en.trim() ? partial.en.trim() : fallback.en;
  const fr = typeof partial.fr === 'string' && partial.fr.trim() ? partial.fr.trim() : fallback.fr;
  return { en, fr };
}

export function normalizeModelLabels(
  labels: Partial<Record<ModelLabelKey, unknown>> | undefined
): Record<ModelLabelKey, LocalizedLabel> {
  const normalized = {} as Record<ModelLabelKey, LocalizedLabel>;

  for (const key of Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]) {
    normalized[key] = normalizeLocalizedValue(labels?.[key], DEFAULT_MODEL_LABELS[key]);
  }

  return normalized;
}

export function getDefaultModelLabelsConfig(): ModelLabelsConfig {
  return {
    labels: Object.fromEntries(
      (Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]).map((key) => [
        key,
        { ...DEFAULT_MODEL_LABELS[key] },
      ])
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
