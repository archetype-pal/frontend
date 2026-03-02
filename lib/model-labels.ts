export type ModelLabelKey =
  | 'historicalItem'
  | 'catalogueNumber'
  | 'position'
  | 'date'
  | 'appManuscripts'
  | 'fieldHairType'
  | 'fieldShelfmark'
  | 'fieldDateMinWeight'
  | 'fieldDateMaxWeight';

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
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
  return `${label}s`;
}
