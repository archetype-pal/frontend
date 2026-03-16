import * as React from 'react';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DynamicFacets } from './dynamic-facets';
import type { FacetData } from '@/types/facets';
import type { ActiveFacetTag } from '@/lib/search-query';

vi.mock('@/contexts/search-context', () => ({
  useSearchContext: () => ({ suggestionsPool: [] }),
}));

describe('DynamicFacets', () => {
  it('renders active filters section above keyword search', () => {
    const facets: FacetData = {
      repository_name: {
        kind: 'list',
        items: [{ label: 'Durham', value: 'Durham', count: 12, href: '' }],
      },
    };

    const html = renderToStaticMarkup(
      <DynamicFacets
        facets={facets}
        searchType="manuscripts"
        keyword=""
        activeTags={[
          {
            id: 'repository_name:Durham',
            facetKey: 'repository_name',
            value: 'Durham',
            label: 'Repository: Durham',
          },
        ]}
        onKeywordChange={() => {}}
        onKeywordSubmit={() => {}}
        selectedFacets={['repository_name_exact:Durham']}
        onFacetClick={() => {}}
        onClearAllFilters={() => {}}
        baseFacetURL="http://localhost:8000/api/v1/search/item-parts/facets"
      />
    );

    const activeFiltersIndex = html.indexOf('Active filters');
    const keywordIndex = html.indexOf('Keyword');
    expect(activeFiltersIndex).toBeGreaterThan(-1);
    expect(keywordIndex).toBeGreaterThan(-1);
    expect(activeFiltersIndex).toBeLessThan(keywordIndex);
  });

  it('calls onFacetClick with deselect payload when removing active filter chip', () => {
    const onFacetClick = vi.fn();
    const facets: FacetData = {
      repository_name: {
        kind: 'list',
        items: [{ label: 'Durham', value: 'Durham', count: 12, href: '' }],
      },
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <DynamicFacets
          facets={facets}
          searchType="manuscripts"
          keyword=""
          activeTags={[
            {
              id: 'repository_name:Durham',
              facetKey: 'repository_name',
              value: 'Durham',
              label: 'Repository: Durham',
            },
          ]}
          onKeywordChange={() => {}}
          onKeywordSubmit={() => {}}
          selectedFacets={['repository_name_exact:Durham']}
          onFacetClick={onFacetClick}
          onClearAllFilters={() => {}}
          baseFacetURL="http://localhost:8000/api/v1/search/item-parts/facets"
        />
      );
    });

    const removeButton = container.querySelector('button[aria-label="Remove Repository: Durham"]');
    expect(removeButton).not.toBeNull();

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onFacetClick).toHaveBeenCalledWith('', {
      type: 'deselectFacet',
      facetKey: 'repository_name',
      value: 'Durham',
    });

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('removes keyword and date chips via onRemoveTag callback', () => {
    const onRemoveTag = vi.fn();
    const facets: FacetData = {
      repository_name: {
        kind: 'list',
        items: [{ label: 'Durham', value: 'Durham', count: 12, href: '' }],
      },
    };
    const activeTags: ActiveFacetTag[] = [
      { id: '__keyword__', facetKey: '__keyword__', value: 'DCD', label: 'Keyword: DCD' },
      { id: '__date__', facetKey: '__date__', value: '1100 - 1200', label: 'Date: 1100 - 1200' },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <DynamicFacets
          facets={facets}
          searchType="manuscripts"
          keyword="draft text"
          activeTags={activeTags}
          onKeywordChange={() => {}}
          onKeywordSubmit={() => {}}
          onRemoveTag={onRemoveTag}
          selectedFacets={[]}
          onFacetClick={() => {}}
          onClearAllFilters={() => {}}
          baseFacetURL="http://localhost:8000/api/v1/search/item-parts/facets"
        />
      );
    });

    const keywordRemove = container.querySelector('button[aria-label="Remove Keyword: DCD"]');
    const dateRemove = container.querySelector('button[aria-label="Remove Date: 1100 - 1200"]');
    expect(keywordRemove).not.toBeNull();
    expect(dateRemove).not.toBeNull();

    act(() => {
      keywordRemove?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dateRemove?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRemoveTag).toHaveBeenCalledTimes(2);
    expect(onRemoveTag).toHaveBeenNthCalledWith(1, activeTags[0]);
    expect(onRemoveTag).toHaveBeenNthCalledWith(2, activeTags[1]);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
