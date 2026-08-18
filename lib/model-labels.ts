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
  | 'footerBottomLine';

export type ModelLabelLocale = 'en' | 'fr' | 'de';

export type LocalizedLabel = {
  en: string;
  fr: string;
  de: string;
};

export type ModelLabelsConfig = {
  labels: Record<ModelLabelKey, LocalizedLabel>;
};

export const DEFAULT_MODEL_LABELS: Record<ModelLabelKey, LocalizedLabel> = {
  historicalItem: { en: 'Historical Item', fr: 'Objet historique', de: 'Historisches Objekt' },
  catalogueNumber: { en: 'Catalogue Number', fr: 'Numéro de catalogue', de: 'Katalognummer' },
  position: { en: 'Position', fr: 'Position', de: 'Position' },
  date: { en: 'Date', fr: 'Date', de: 'Datum' },
  appManuscripts: { en: 'Manuscripts', fr: 'Manuscrits', de: 'Manuskripte' },
  fieldHairType: { en: 'Hair Type', fr: 'Type de poil', de: 'Haartyp' },
  fieldShelfmark: { en: 'Shelfmark', fr: 'Cote', de: 'Signatur' },
  fieldDateMinWeight: { en: 'Minimum weight', fr: 'Poids minimum', de: 'Mindestgewicht' },
  fieldDateMaxWeight: { en: 'Maximum weight', fr: 'Poids maximum', de: 'Höchstgewicht' },
  searchCategoryImages: { en: 'Images', fr: 'Images', de: 'Bilder' },
  searchCategoryScribes: { en: 'Scribes', fr: 'Copistes', de: 'Schreiber' },
  searchCategoryHands: { en: 'Hands', fr: 'Mains', de: 'Hände' },
  searchCategoryGraphs: { en: 'Graphs', fr: 'Graphes', de: 'Grapheme' },
  searchCategoryTexts: { en: 'Texts', fr: 'Textes', de: 'Texte' },
  searchCategoryClauses: { en: 'Clauses', fr: 'Clauses', de: 'Klauseln' },
  searchCategoryPeople: { en: 'People', fr: 'Personnes', de: 'Personen' },
  searchCategoryPlaces: { en: 'Places', fr: 'Lieux', de: 'Orte' },
  siteTitle: { en: 'Archetype', fr: 'Archetype', de: 'Archetype' },
  siteTagline: {
    en: 'Archetype tagline',
    fr: 'Archetype tagline',
    de: 'Archetype tagline',
  },
  footerLine1: {
    en: 'Footer first section',
    fr: 'Pied de page, première section',
    de: 'Fußzeile, erster Abschnitt',
  },
  footerLine2: {
    en: 'Footer second section',
    fr: 'Pied de page, deuxième section',
    de: 'Fußzeile, zweiter Abschnitt',
  },
  footerBottomLine: {
    en:
      'Built with Archetype.',
    fr:
      'Construit avec Archetype.',
    de:
      'Erstellt mit Archetype.',
  },
};

export function normalizeLocalizedValue(value: unknown, fallback: LocalizedLabel): LocalizedLabel {
  // Pre-i18n config files stored a single string shown to every locale. Seed
  // both languages from it so an existing customization survives the upgrade
  // instead of reverting to the English default for French visitors.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed, fr: trimmed, de: trimmed } : fallback;
  }

  if (!value || typeof value !== 'object') return fallback;

  const partial = value as Partial<Record<ModelLabelLocale, unknown>>;
  const en = typeof partial.en === 'string' && partial.en.trim() ? partial.en.trim() : fallback.en;
  const fr = typeof partial.fr === 'string' && partial.fr.trim() ? partial.fr.trim() : fallback.fr;
  const de = typeof partial.de === 'string' && partial.de.trim() ? partial.de.trim() : fallback.de;
  return { en, fr, de };
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
