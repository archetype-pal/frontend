import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CollectionItem } from '@/contexts/collection-context';
import { useCollectionItemSelection } from './use-collection-item-selection';

const image: CollectionItem = { id: 10, type: 'image' };
const graph: CollectionItem = { id: 20, type: 'graph' };
const items = [image, graph];

describe('useCollectionItemSelection', () => {
  it('selects individual items and toggles all visible items', () => {
    const { result, rerender } = renderHook(
      ({ visibleItems }) => useCollectionItemSelection('research', items, visibleItems),
      { initialProps: { visibleItems: items } }
    );

    act(() => result.current.toggleItem(image));
    expect(result.current.selectedItems).toEqual([image]);
    expect(result.current.someVisibleItemsSelected).toBe(true);

    rerender({ visibleItems: [graph] });
    act(() => result.current.toggleVisibleItems(true));
    expect(result.current.selectedItems).toEqual(items);

    act(() => result.current.toggleVisibleItems(false));
    expect(result.current.selectedItems).toEqual([image]);
  });

  it('does not carry selection into another named collection', () => {
    const { result, rerender } = renderHook(
      ({ collectionId }) => useCollectionItemSelection(collectionId, items, items),
      { initialProps: { collectionId: 'research' } }
    );

    act(() => result.current.toggleItem(image));
    expect(result.current.selectedItems).toEqual([image]);

    rerender({ collectionId: 'archive' });
    expect(result.current.selectedItems).toEqual([]);
  });

  it('ignores selected items that were removed from the active collection', () => {
    const { result, rerender } = renderHook(
      ({ currentItems }) => useCollectionItemSelection('research', currentItems, currentItems),
      { initialProps: { currentItems: items } }
    );

    act(() => result.current.toggleItem(image));
    expect(result.current.selectedItems).toEqual([image]);

    rerender({ currentItems: [graph] });
    expect(result.current.selectedItems).toEqual([]);
  });
});
