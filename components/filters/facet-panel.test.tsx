import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { FacetPanel } from './facet-panel';
import type { FacetListItem } from '@/types/facets';

const ITEMS: FacetListItem[] = [
  { label: 'Durham', value: 'Durham', count: 12, href: '' },
  { label: 'St Andrews', value: 'St Andrews', count: 7, href: '' },
];

const BASE_URL = 'http://localhost:8000/api/v1/search/item-parts/facets';

function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('FacetPanel exclude/remove affordance', () => {
  it('offers Exclude on an unselected value and calls onExclude', () => {
    const onExclude = vi.fn();
    const onSelect = vi.fn();
    const { container, cleanup } = mount(
      <FacetPanel
        id="repository_name"
        title="Repository"
        items={ITEMS}
        baseFacetURL={BASE_URL}
        selectedValue={null}
        onSelect={onSelect}
        onExclude={onExclude}
      />
    );

    expect(container.querySelector('button[aria-label="Exclude Durham"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Remove filter Durham"]')).toBeNull();

    act(() => {
      container
        .querySelector('button[aria-label="Exclude Durham"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onExclude).toHaveBeenCalledWith('Durham');

    cleanup();
  });

  it('replaces Exclude with a plain Remove on the selected value (no impossible include+exclude)', () => {
    const onExclude = vi.fn();
    const onSelect = vi.fn();
    const { container, cleanup } = mount(
      <FacetPanel
        id="repository_name"
        title="Repository"
        items={ITEMS}
        baseFacetURL={BASE_URL}
        selectedValue="Durham"
        onSelect={onSelect}
        onExclude={onExclude}
      />
    );

    // The exclude (crossed-circle) affordance is gone from the active row...
    expect(container.querySelector('button[aria-label="Exclude Durham"]')).toBeNull();
    // ...replaced by a remove control that deselects (never excludes).
    const removeBtn = container.querySelector('button[aria-label="Remove filter Durham"]');
    expect(removeBtn).not.toBeNull();

    act(() => {
      removeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledWith(BASE_URL, 'Durham', true);
    expect(onExclude).not.toHaveBeenCalled();

    // Other, unselected rows still offer Exclude.
    expect(container.querySelector('button[aria-label="Exclude St Andrews"]')).not.toBeNull();

    cleanup();
  });
});

describe('FacetPanel excluded-values strip', () => {
  it('surfaces an excluded value absent from the list and reverts it via onRemoveExclude', () => {
    const onRemoveExclude = vi.fn();
    const { container, cleanup } = mount(
      <FacetPanel
        id="repository_name"
        title="Repository"
        items={ITEMS} // "British Library" is NOT in the distribution here
        baseFacetURL={BASE_URL}
        selectedValue={null}
        onSelect={vi.fn()}
        onExclude={vi.fn()}
        excludedValues={['British Library']}
        onRemoveExclude={onRemoveExclude}
      />
    );

    // Re-injected as a revertible chip even though it's gone from the distribution.
    const revert = container.querySelector('button[aria-label="Stop excluding British Library"]');
    expect(revert).not.toBeNull();

    act(() => {
      revert?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onRemoveExclude).toHaveBeenCalledWith('British Library');

    cleanup();
  });

  it('moves an excluded value out of the selectable list into the strip', () => {
    const { container, cleanup } = mount(
      <FacetPanel
        id="repository_name"
        title="Repository"
        items={ITEMS} // Durham, St Andrews
        baseFacetURL={BASE_URL}
        selectedValue={null}
        onSelect={vi.fn()}
        onExclude={vi.fn()}
        excludedValues={['Durham']}
        onRemoveExclude={vi.fn()}
      />
    );

    // Durham is no longer an excludable row in the list...
    expect(container.querySelector('button[aria-label="Exclude Durham"]')).toBeNull();
    // ...it lives in the Excluded strip instead.
    expect(container.querySelector('button[aria-label="Stop excluding Durham"]')).not.toBeNull();
    // A non-excluded value still offers Exclude.
    expect(container.querySelector('button[aria-label="Exclude St Andrews"]')).not.toBeNull();

    cleanup();
  });
});
