import { describe, expect, it } from 'vitest';

import { searchHref, searchHrefForKeyword, stringifySearchParams } from './search-routing';

describe('search routing helpers', () => {
  it('builds typed search links with keyword query params', () => {
    expect(searchHrefForKeyword('images', 'Kelso Abbey')).toBe(
      '/search/images?keyword=Kelso+Abbey'
    );
    expect(searchHrefForKeyword('images', '   ')).toBe('/search/images');
  });

  it('preserves repeated query params when redirecting between search types', () => {
    expect(
      searchHref('images', {
        keyword: 'Kelso',
        repository: ['NLS', 'BL'],
        empty: undefined,
      })
    ).toBe('/search/images?keyword=Kelso&repository=NLS&repository=BL');
  });

  it('serializes URLSearchParams without changing their order', () => {
    const params = new URLSearchParams('keyword=Kelso&offset=20');
    expect(stringifySearchParams(params)).toBe('keyword=Kelso&offset=20');
  });
});
