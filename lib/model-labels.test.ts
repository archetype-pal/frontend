import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_LABELS,
  getDefaultModelLabelsConfig,
  normalizeModelLabels,
  pluralizeLabel,
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
      historicalItem: 'Object',
      catalogueNumber: 'Cat #',
    });
    expect(result.historicalItem).toBe('Object');
    expect(result.catalogueNumber).toBe('Cat #');
    // Untouched keys keep defaults
    expect(result.position).toBe(DEFAULT_MODEL_LABELS.position);
    expect(result.appManuscripts).toBe(DEFAULT_MODEL_LABELS.appManuscripts);
  });

  it('trims whitespace around override values', () => {
    expect(normalizeModelLabels({ historicalItem: '   Object   ' }).historicalItem).toBe('Object');
  });

  it('falls back to the default for empty / whitespace-only strings', () => {
    const result = normalizeModelLabels({
      historicalItem: '',
      catalogueNumber: '   ',
    });
    expect(result.historicalItem).toBe(DEFAULT_MODEL_LABELS.historicalItem);
    expect(result.catalogueNumber).toBe(DEFAULT_MODEL_LABELS.catalogueNumber);
  });

  it('falls back to the default for non-string values (numbers, null, objects)', () => {
    const result = normalizeModelLabels({
      historicalItem: 42 as unknown as string,
      catalogueNumber: null as unknown as string,
      position: { foo: 'bar' } as unknown as string,
    });
    expect(result.historicalItem).toBe(DEFAULT_MODEL_LABELS.historicalItem);
    expect(result.catalogueNumber).toBe(DEFAULT_MODEL_LABELS.catalogueNumber);
    expect(result.position).toBe(DEFAULT_MODEL_LABELS.position);
  });

  it('does not include keys not in DEFAULT_MODEL_LABELS even if supplied', () => {
    const result = normalizeModelLabels({
      historicalItem: 'Object',
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
    a.labels.historicalItem = 'mutated';
    expect(b.labels.historicalItem).toBe(DEFAULT_MODEL_LABELS.historicalItem);
  });

  it('matches DEFAULT_MODEL_LABELS for every key', () => {
    const cfg = getDefaultModelLabelsConfig();
    for (const key of Object.keys(DEFAULT_MODEL_LABELS) as ModelLabelKey[]) {
      expect(cfg.labels[key]).toBe(DEFAULT_MODEL_LABELS[key]);
    }
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

  it('handles uppercase suffixes the same way (case-insensitive match)', () => {
    expect(pluralizeLabel('CITY')).toBe('CITies');
    expect(pluralizeLabel('BOX')).toBe('BOXes');
  });
});
