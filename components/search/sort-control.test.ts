import { describe, expect, it } from 'vitest';
import {
  HIDDEN_SORT_FIELDS,
  buildSortFields,
  canonicalSortAttribute,
  formatOrdering,
  humanizeSortField,
  isOrderingUnsupported,
  parseOrdering,
  type SearchOrdering,
} from '@/lib/search-sort';

/** Mirror the component's lookup: humanize everything, no translations in play. */
const humanize = (attribute: string) => humanizeSortField(attribute);

function ordering(names: string[]): SearchOrdering {
  return {
    current: '-id',
    options: names.map((name) => ({ name, text: `${name} (asc)`, url: `/?ordering=${name}` })),
  };
}

describe('buildSortFields', () => {
  it('collapses each asc/desc option pair into a single field', () => {
    const fields = buildSortFields(
      ordering(['shelfmark', '-shelfmark', 'locus', '-locus']),
      humanize
    );

    expect(fields.map((f) => f.attribute)).toEqual(['shelfmark', 'locus']);
  });

  it('excludes the backend-internal `id` ordering', () => {
    const fields = buildSortFields(ordering(['id', '-id', 'shelfmark']), humanize);

    expect(HIDDEN_SORT_FIELDS.has('id')).toBe(true);
    expect(fields.map((f) => f.attribute)).toEqual(['shelfmark']);
  });

  it('orders by SORT_FIELD_ORDER regardless of the order the backend sent', () => {
    const fields = buildSortFields(
      ordering(['hand_name', 'date_min', 'shelfmark', 'repository_city']),
      humanize
    );

    expect(fields.map((f) => f.attribute)).toEqual([
      'repository_city',
      'shelfmark',
      'date_min',
      'hand_name',
    ]);
  });

  it('puts unranked attributes after the ranked ones, alphabetically by label', () => {
    const fields = buildSortFields(
      ordering(['zeta_field', 'alpha_field', 'shelfmark', 'middle_field']),
      humanize
    );

    expect(fields.map((f) => f.attribute)).toEqual([
      'shelfmark',
      'alpha_field',
      'middle_field',
      'zeta_field',
    ]);
  });

  it('uses the injected label lookup, so translations drive the display order', () => {
    const labels: Record<string, string> = { alpha_field: 'Zebra', zeta_field: 'Aardvark' };
    const fields = buildSortFields(ordering(['alpha_field', 'zeta_field']), (a) => labels[a] ?? a);

    expect(fields.map((f) => f.label)).toEqual(['Aardvark', 'Zebra']);
  });

  it('returns nothing before the first response arrives', () => {
    expect(buildSortFields(undefined, humanize)).toEqual([]);
    expect(buildSortFields({ current: '-id', options: [] }, humanize)).toEqual([]);
  });
});

describe('humanizeSortField', () => {
  it('turns snake_case into Title Case', () => {
    expect(humanizeSortField('repository_city')).toBe('Repository City');
    expect(humanizeSortField('shelfmark')).toBe('Shelfmark');
    expect(humanizeSortField('number_of_annotations')).toBe('Number Of Annotations');
  });
});

describe('parseOrdering / formatOrdering', () => {
  it('reads an ascending ordering', () => {
    expect(parseOrdering('shelfmark')).toEqual({ attribute: 'shelfmark', descending: false });
  });

  it('reads a leading-minus ordering as descending', () => {
    expect(parseOrdering('-date_min')).toEqual({ attribute: 'date_min', descending: true });
  });

  it('treats an unset ordering as relevance', () => {
    expect(parseOrdering(null)).toEqual({ attribute: null, descending: false });
    expect(parseOrdering('')).toEqual({ attribute: null, descending: false });
    expect(parseOrdering('   ')).toEqual({ attribute: null, descending: false });
    expect(parseOrdering(undefined)).toEqual({ attribute: null, descending: false });
  });

  it('round-trips through formatOrdering', () => {
    for (const value of ['shelfmark', '-shelfmark', 'date_min', '-repository_city']) {
      const { attribute, descending } = parseOrdering(value);
      expect(formatOrdering(attribute!, descending)).toBe(value);
    }
  });

  it('formats both directions', () => {
    expect(formatOrdering('locus', false)).toBe('locus');
    expect(formatOrdering('locus', true)).toBe('-locus');
  });

  it('canonicalises the `_exact` column convention so old URLs still match', () => {
    expect(parseOrdering('shelfmark_exact')).toEqual({
      attribute: 'shelfmark',
      descending: false,
    });
    expect(parseOrdering('-number_of_images_exact')).toEqual({
      attribute: 'number_of_images',
      descending: true,
    });
  });
});

describe('canonicalSortAttribute', () => {
  it('strips the descending marker and the `_exact` filter suffix', () => {
    expect(canonicalSortAttribute('shelfmark')).toBe('shelfmark');
    expect(canonicalSortAttribute('-shelfmark')).toBe('shelfmark');
    expect(canonicalSortAttribute('shelfmark_exact')).toBe('shelfmark');
    expect(canonicalSortAttribute('  -catalogue_numbers_exact ')).toBe('catalogue_numbers');
  });
});

describe('isOrderingUnsupported', () => {
  const manuscripts = ordering(['shelfmark', '-shelfmark', 'date_min', '-date_min']);

  it('flags an attribute the current index does not sort on', () => {
    // e.g. `?ordering=scribe` bookmarked from /search/graphs, opened on manuscripts
    expect(isOrderingUnsupported('scribe', manuscripts)).toBe(true);
    expect(isOrderingUnsupported('-allograph', manuscripts)).toBe(true);
  });

  it('accepts an attribute the index does sort on, either direction', () => {
    expect(isOrderingUnsupported('shelfmark', manuscripts)).toBe(false);
    expect(isOrderingUnsupported('-date_min', manuscripts)).toBe(false);
    expect(isOrderingUnsupported('shelfmark_exact', manuscripts)).toBe(false);
  });

  it('treats a missing ordering block as unknown, never as unsupported', () => {
    // EMPTY_SEARCH_RESULT (failed facets fetch) or the pre-response first render:
    // clearing here would wipe a perfectly valid sort.
    expect(isOrderingUnsupported('shelfmark', undefined)).toBe(false);
    expect(isOrderingUnsupported('shelfmark', { current: '-id', options: [] })).toBe(false);
  });

  it('never flags an unset ordering, so the fix cannot re-trigger itself', () => {
    expect(isOrderingUnsupported(null, manuscripts)).toBe(false);
    expect(isOrderingUnsupported('', manuscripts)).toBe(false);
    expect(isOrderingUnsupported(undefined, manuscripts)).toBe(false);
  });
});
