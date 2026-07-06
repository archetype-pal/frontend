import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_LABELS,
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  pluralizeLabel,
  resolveModelLabel,
  type ModelLabelKey,
} from './model-labels';

describe('normalizeModelLabels', () => {
  it('returns the canonical defaults when input is undefined', () => {
    expect(normalizeModelLabels(undefined)).toEqual(DEFAULT_MODEL_LABELS);
  });

  it('returns the canonical defaults when input is empty', () => {
    expect(normalizeModelLabels({})).toEqual(DEFAULT_MODEL_LABELS);
  });

  it('overrides only the keys explicitly provided', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: 'Object', fr: 'Objet' },
      catalogueNumber: { en: 'Cat #', fr: 'N° cat.' },
    });
    expect(result.historicalItem).toEqual({ en: 'Object', fr: 'Objet' });
    expect(result.catalogueNumber).toEqual({ en: 'Cat #', fr: 'N° cat.' });
    // Untouched keys keep defaults
    expect(result.position).toEqual(DEFAULT_MODEL_LABELS.position);
    expect(result.appManuscripts).toEqual(DEFAULT_MODEL_LABELS.appManuscripts);
  });

  it('overrides one locale while keeping the other locale default', () => {
    const result = normalizeModelLabels({ historicalItem: { fr: 'Objet' } });
    expect(result.historicalItem).toEqual({ en: DEFAULT_MODEL_LABELS.historicalItem.en, fr: 'Objet' });
  });

  it('migrates a legacy plain-string value to both locales', () => {
    const result = normalizeModelLabels({
      historicalItem: 'Object' as unknown as Record<string, unknown>,
    });
    expect(result.historicalItem).toEqual({ en: 'Object', fr: 'Object' });
  });

  it('trims whitespace around override values', () => {
    expect(
      normalizeModelLabels({ historicalItem: { en: '   Object   ', fr: '   Objet   ' } })
        .historicalItem
    ).toEqual({ en: 'Object', fr: 'Objet' });
  });

  it('falls back to the default for empty / whitespace-only strings', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: '', fr: '   ' },
    });
    expect(result.historicalItem).toEqual(DEFAULT_MODEL_LABELS.historicalItem);
  });

  it('falls back to the default for non-object / non-string values (numbers, null)', () => {
    const result = normalizeModelLabels({
      historicalItem: 42 as unknown as Record<string, unknown>,
      catalogueNumber: null as unknown as Record<string, unknown>,
    });
    expect(result.historicalItem).toEqual(DEFAULT_MODEL_LABELS.historicalItem);
    expect(result.catalogueNumber).toEqual(DEFAULT_MODEL_LABELS.catalogueNumber);
  });

  it('does not include keys not in DEFAULT_MODEL_LABELS even if supplied', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: 'Object', fr: 'Objet' },
      // @ts-expect-error — testing runtime behavior
      bogusKey: 'should be ignored',
    });
    expect(Object.keys(result)).toEqual(Object.keys(DEFAULT_MODEL_LABELS));
  });
});

describe('getDefaultModelLabelsConfig', () => {
  it('returns a fresh labels object that callers can mutate without affecting defaults', () => {
    const a = getDefaultModelLabelsConfig();
    const b = getDefaultModelLabelsConfig();
    expect(a.labels).not.toBe(b.labels);
    a.labels.historicalItem = { en: 'mutated', fr: 'mutated' };
    expect(b.labels.historicalItem).toEqual(DEFAULT_MODEL_LABELS.historicalItem);
  });

  it('matches DEFAULT_MODEL_LABELS for every key', () => {
    const cfg = getDefaultModelLabelsConfig();
    for (const key of Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]) {
      expect(cfg.labels[key]).toEqual(DEFAULT_MODEL_LABELS[key]);
    }
  });
});

describe('resolveModelLabel', () => {
  it('returns the value for the requested locale', () => {
    expect(resolveModelLabel({ en: 'Manuscripts', fr: 'Manuscrits' }, 'fr')).toBe('Manuscrits');
  });

  it('falls back to English when the requested locale is empty', () => {
    expect(resolveModelLabel({ en: 'Manuscripts', fr: '' }, 'fr')).toBe('Manuscripts');
  });
});

describe('pluralizeLabel', () => {
  it('appends "s" for the simple case', () => {
    expect(pluralizeLabel('Manuscript')).toBe('Manuscripts');
    expect(pluralizeLabel('Item')).toBe('Items');
  });

  it('uses "ies" for words ending in consonant + y', () => {
    expect(pluralizeLabel('City')).toBe('Cities');
    expect(pluralizeLabel('Country')).toBe('Countries');
  });

  it('uses "s" (not "ies") for words ending in vowel + y', () => {
    expect(pluralizeLabel('Day')).toBe('Days');
    expect(pluralizeLabel('Boy')).toBe('Boys');
  });

  it('uses "es" for words ending in s, x, z, ch, sh', () => {
    expect(pluralizeLabel('Box')).toBe('Boxes');
    expect(pluralizeLabel('Bus')).toBe('Buses');
    expect(pluralizeLabel('Buzz')).toBe('Buzzes');
    expect(pluralizeLabel('Church')).toBe('Churches');
    expect(pluralizeLabel('Bush')).toBe('Bushes');
  });

  it('matches the plural suffix casing to an all-caps label', () => {
    expect(pluralizeLabel('CITY')).toBe('CITIES');
    expect(pluralizeLabel('BOX')).toBe('BOXES');
  });
});
