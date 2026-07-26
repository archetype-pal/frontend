import { describe, expect, it } from 'vitest';

import { SEARCH_RESULT_TYPES, getFacetOrder } from '@/lib/search-types';
import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';
import siteFeatures from './site-features.json';

// The checked-in config seeds guest visibility. Consumers match on the header
// string and silently drop anything unrecognised (results-table.tsx, and the
// export map in search-export.ts), so a typo here costs a column with no error
// anywhere — that is how `"Ann."` hid the Annotations column. Admins may freely
// change *which* fields are visible and in what order; these tests only assert
// that every name still refers to something real.
describe('site-features.json', () => {
  const categories = siteFeatures.searchCategories as Record<
    string,
    { visibleColumns: string[]; visibleFacets: string[] }
  >;

  it('covers every search result type', () => {
    expect(Object.keys(categories).sort()).toEqual([...SEARCH_RESULT_TYPES].sort());
  });

  it('names only columns the results table actually defines', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      for (const header of categories[type].visibleColumns) {
        expect(COLUMN_HEADERS_BY_TYPE[type]).toContain(header);
      }
    }
  });

  it('names only facets the search config actually defines', () => {
    for (const type of SEARCH_RESULT_TYPES) {
      for (const facet of categories[type].visibleFacets) {
        expect(getFacetOrder(type)).toContain(facet);
      }
    }
  });

  // Guests get exactly this list (search-visibility.ts); logged-in researchers
  // get the full facet order, so a facet added to search-types.ts but not here
  // ships invisible to the public rail — the surface it was added for. Adding a
  // manuscripts facet therefore means adding it here too (an operator can still
  // untick it at runtime; this only pins the checked-in seed).
  it('seeds every manuscripts facet as visible to anonymous visitors', () => {
    expect([...categories.manuscripts.visibleFacets].sort()).toEqual(
      [...getFacetOrder('manuscripts')].sort()
    );
  });
});
