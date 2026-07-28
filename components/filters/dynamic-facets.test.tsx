import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DynamicFacets } from './dynamic-facets';
import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import type { FacetData } from '@/types/facets';
import type { ActiveFacetTag } from '@/lib/search-query';

vi.mock('@/contexts/search-context', () => ({
  useSearchContext: () => ({
    suggestionsPool: [],
    getServerSuggestions: vi.fn().mockResolvedValue([]),
    setSuggestionsPool: vi.fn(),
    loadGlobalSuggestions: vi.fn(),
  }),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function withProviders(ui: React.ReactElement) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ModelLabelsProvider>{ui}</ModelLabelsProvider>
    </QueryClientProvider>
  );
}

describe('DynamicFacets', () => {
  it('renders active filters section above keyword search', () => {
    const facets: FacetData = {
      repository_name: {
        kind: 'list',
        items: [{ label: 'Durham', value: 'Durham', count: 12, href: '' }],
      },
    };

    const html = renderToStaticMarkup(
      withProviders(
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
      )
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
        withProviders(
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
        )
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
        withProviders(
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
        )
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

  it('surfaces an excluded value as a revertible strip inside its facet panel', () => {
    const onFacetClick = vi.fn();
    const facets: FacetData = {
      repository_name: {
        kind: 'list',
        items: [{ label: 'Durham', value: 'Durham', count: 12, href: '' }],
      },
    };
    // British Library is excluded and (realistically) absent from the distribution.
    const activeTags: ActiveFacetTag[] = [
      {
        id: '__not__:repository_name:British Library',
        facetKey: 'repository_name',
        value: 'British Library',
        label: 'NOT Repository: British Library',
        exclude: true,
      },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        withProviders(
          <DynamicFacets
            facets={facets}
            searchType="manuscripts"
            keyword=""
            activeTags={activeTags}
            onKeywordChange={() => {}}
            onKeywordSubmit={() => {}}
            selectedFacets={[]}
            onFacetClick={onFacetClick}
            onClearAllFilters={() => {}}
            baseFacetURL="http://localhost:8000/api/v1/search/item-parts/facets"
          />
        )
      );
    });

    const revert = container.querySelector('button[aria-label="Stop excluding British Library"]');
    expect(revert).not.toBeNull();

    act(() => {
      revert?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onFacetClick).toHaveBeenCalledWith('', {
      type: 'removeExclusion',
      facetKey: 'repository_name',
      value: 'British Library',
    });

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  // The msDesc extractor indexes ODD codes (perg, textualisNorthern, flourInit)
  // because the code is the filter identity; the rail must gloss them with the
  // labels the authoring dropdowns already use, without changing what a click
  // filters on. Values outside the (type="semi") ODD lists stay as authored.
  it('renders msDesc facet values with their ODD labels but filters on the raw code', () => {
    const onFacetClick = vi.fn();
    const facets: FacetData = {
      material: {
        kind: 'list',
        items: [{ label: 'perg', value: 'perg', count: 12, href: '' }],
      },
      script: {
        kind: 'list',
        items: [
          { label: 'textualisNorthern', value: 'textualisNorthern', count: 7, href: '' },
          { label: 'charterHandNotInTheOdd', value: 'charterHandNotInTheOdd', count: 1, href: '' },
        ],
      },
      origin_place: {
        kind: 'list',
        items: [{ label: 'Kelso', value: 'Kelso', count: 4, href: '' }],
      },
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        withProviders(
          <DynamicFacets
            facets={facets}
            searchType="manuscripts"
            keyword=""
            activeTags={[]}
            onKeywordChange={() => {}}
            onKeywordSubmit={() => {}}
            selectedFacets={[]}
            onFacetClick={onFacetClick}
            onClearAllFilters={() => {}}
            baseFacetURL="http://localhost:8000/api/v1/search/item-parts/facets"
          />
        )
      );
    });

    expect(container.textContent).toContain('Parchment (vellum)');
    expect(container.textContent).toContain('Gothic textualis (Northern)');
    expect(container.textContent).not.toContain('perg');
    // Unlisted (semi-open) values and authored place names are shown verbatim.
    expect(container.textContent).toContain('charterHandNotInTheOdd');
    expect(container.textContent).toContain('Kelso');

    const materialOption = container.querySelector('button[aria-label="Parchment (vellum), 12"]');
    expect(materialOption).not.toBeNull();

    act(() => {
      materialOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onFacetClick).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/search/item-parts/facets',
      {
        type: 'selectFacet',
        facetKey: 'material',
        value: 'perg',
      }
    );

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
