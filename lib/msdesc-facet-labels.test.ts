import { describe, expect, it } from 'vitest';

import { formatMsDescFacetValue, localizeMsDescFacetItems } from '@/lib/msdesc-facet-labels';
import messages from '@/messages/en.json';

/** Stands in for `useTranslations('backoffice')`. */
function t(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, segment) => (node as Record<string, unknown> | undefined)?.[segment],
      messages.backoffice
    );
  if (typeof value !== 'string') throw new Error(`missing message: backoffice.${key}`);
  return value;
}

describe('formatMsDescFacetValue', () => {
  it('glosses the three ODD-coded manuscript facets', () => {
    expect(formatMsDescFacetValue('material', 'perg', t)).toBe('Parchment (vellum)');
    expect(formatMsDescFacetValue('script', 'textualisNorthern', t)).toBe(
      'Gothic textualis (Northern)'
    );
    expect(formatMsDescFacetValue('deco_type', 'flourInit', t)).toBe(
      'Flourished (penwork) initial'
    );
  });

  it('passes values outside the ODD list through as authored', () => {
    // `handNote/@script` and `decoNote/@type` are type="semi" — open by design,
    // and the extractor indexes unlisted values verbatim.
    expect(formatMsDescFacetValue('script', 'charterHandNotInTheOdd', t)).toBe(
      'charterHandNotInTheOdd'
    );
  });

  it('leaves non-vocabulary facets alone', () => {
    // Authored place names are already human-readable; repository/type facets
    // are not msDesc-derived at all.
    expect(formatMsDescFacetValue('origin_place', 'Kelso', t)).toBe('Kelso');
    expect(formatMsDescFacetValue('repository_name', 'perg', t)).toBe('perg');
  });
});

describe('localizeMsDescFacetItems', () => {
  const items = [
    { label: 'perg', value: 'perg', count: 12, href: '?material=perg' },
    { label: 'chart', value: 'chart', count: 3, href: '?material=chart' },
  ];

  it('relabels items without touching the filter value or href', () => {
    const localized = localizeMsDescFacetItems('material', items, t);

    expect(localized.map((item) => item.label)).toEqual(['Parchment (vellum)', 'Paper']);
    expect(localized.map((item) => item.value)).toEqual(['perg', 'chart']);
    expect(localized.map((item) => item.href)).toEqual(['?material=perg', '?material=chart']);
    expect(localized.map((item) => item.count)).toEqual([12, 3]);
  });

  it('returns the same array for a facet with no vocabulary', () => {
    expect(localizeMsDescFacetItems('repository_name', items, t)).toBe(items);
  });
});
