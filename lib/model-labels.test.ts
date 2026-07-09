import { describe, expect, it } from 'vitest';

import {
  MODEL_LABEL_KEYS,
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  pluralizeLabel,
  resolveModelLabel,
} from './model-labels';

describe('normalizeModelLabels', () => {

  it('overrides only the keys explicitly provided', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: 'Object', fr: 'Objet' },
      catalogueNumber: { en: 'Cat #', fr: 'N° cat.' },
    });
    expect(result.historicalItem).toEqual({ en: 'Object', fr: 'Objet' });
    expect(result.catalogueNumber).toEqual({ en: 'Cat #', fr: 'N° cat.' });
    // Untouched keys normalize to blank — there is no hardcoded fallback text
    expect(result.position).toEqual({ en: '', fr: '' });
    expect(result.appManuscripts).toEqual({ en: '', fr: '' });
  });

  it('overrides one locale while the other locale normalizes to blank', () => {
    const result = normalizeModelLabels({ historicalItem: { fr: 'Objet' } });
    expect(result.historicalItem).toEqual({ en: '', fr: 'Objet' });
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

  it('normalizes empty / whitespace-only strings to blank', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: '', fr: '   ' },
    });
    expect(result.historicalItem).toEqual({ en: '', fr: '' });
  });

  it('normalizes non-object / non-string values (numbers, null) to blank', () => {
    const result = normalizeModelLabels({
      historicalItem: 42 as unknown as Record<string, unknown>,
      catalogueNumber: null as unknown as Record<string, unknown>,
    });
    expect(result.historicalItem).toEqual({ en: '', fr: '' });
    expect(result.catalogueNumber).toEqual({ en: '', fr: '' });
  });

  it('does not include keys not in MODEL_LABEL_KEYS even if supplied', () => {
    const result = normalizeModelLabels({
      historicalItem: { en: 'Object', fr: 'Objet' },
      // @ts-expect-error — testing runtime behavior
      bogusKey: 'should be ignored',
    });
    expect(Object.keys(result)).toEqual(MODEL_LABEL_KEYS);
  });
});

describe('getDefaultModelLabelsConfig', () => {
  it('returns a fresh labels object that callers can mutate without affecting other calls', () => {
    const a = getDefaultModelLabelsConfig();
    const b = getDefaultModelLabelsConfig();
    expect(a.labels).not.toBe(b.labels);
    a.labels.historicalItem = { en: 'mutated', fr: 'mutated' };
    expect(b.labels.historicalItem).toEqual({ en: '', fr: '' });
  });

  it('returns blank en/fr strings for every key — there is no hardcoded fallback text', () => {
    const cfg = getDefaultModelLabelsConfig();
    for (const key of MODEL_LABEL_KEYS) {
      expect(cfg.labels[key]).toEqual({ en: '', fr: '' });
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
