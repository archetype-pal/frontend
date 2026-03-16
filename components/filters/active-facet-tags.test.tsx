import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ActiveFacetTags } from './active-facet-tags';
import type { ActiveFacetTag } from '@/lib/search-query';

describe('ActiveFacetTags', () => {
  it('calls onRemove when remove button is clicked', () => {
    const item: ActiveFacetTag = {
      id: 'repository_name:Durham',
      facetKey: 'repository_name',
      value: 'Durham',
      label: 'Repository: Durham',
    };
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ActiveFacetTags items={[item]} onRemove={onRemove} onClearAll={onClearAll} />);
    });

    const removeButton = container.querySelector('button[aria-label="Remove Repository: Durham"]');
    expect(removeButton).not.toBeNull();

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(item);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('supports overflow with show more/less toggle', () => {
    const items: ActiveFacetTag[] = [
      { id: 'a:1', facetKey: 'a', value: '1', label: 'A: 1' },
      { id: 'b:2', facetKey: 'b', value: '2', label: 'B: 2' },
      { id: 'c:3', facetKey: 'c', value: '3', label: 'C: 3' },
      { id: 'd:4', facetKey: 'd', value: '4', label: 'D: 4' },
      { id: 'e:5', facetKey: 'e', value: '5', label: 'E: 5' },
      { id: 'f:6', facetKey: 'f', value: '6', label: 'F: 6' },
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ActiveFacetTags items={items} onRemove={() => {}} onClearAll={() => {}} />);
    });

    expect(container.textContent).toContain('Show 2 more');
    expect(container.textContent).not.toContain('E: 5');

    const toggleButton = container.querySelector('button[aria-label="Show 2 more active filters"]');
    expect(toggleButton).not.toBeNull();
    act(() => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('E: 5');
    expect(container.textContent).toContain('Show less');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
