import { beforeEach, describe, expect, it } from 'vitest';

import { useCompareStore, MAX_COMPARE_ITEMS, type CompareItem } from './compare-store';

function item(itemPartId: number): CompareItem {
  return { itemPartId, displayLabel: `Manuscript ${itemPartId}` };
}

beforeEach(() => {
  useCompareStore.setState({ items: [] });
  sessionStorage.clear();
});

describe('useCompareStore', () => {
  it('starts empty', () => {
    expect(useCompareStore.getState().items).toEqual([]);
  });

  it('adds an item and reports it as staged', () => {
    const added = useCompareStore.getState().addItem(item(1));
    expect(added).toBe(true);
    expect(useCompareStore.getState().isInCompare(1)).toBe(true);
    expect(useCompareStore.getState().items).toHaveLength(1);
  });

  it('refuses a duplicate item', () => {
    useCompareStore.getState().addItem(item(1));
    const added = useCompareStore.getState().addItem(item(1));
    expect(added).toBe(false);
    expect(useCompareStore.getState().items).toHaveLength(1);
  });

  it(`caps the selection at ${MAX_COMPARE_ITEMS} items`, () => {
    for (let i = 0; i < MAX_COMPARE_ITEMS; i++) {
      expect(useCompareStore.getState().addItem(item(i))).toBe(true);
    }
    const overCap = useCompareStore.getState().addItem(item(999));
    expect(overCap).toBe(false);
    expect(useCompareStore.getState().items).toHaveLength(MAX_COMPARE_ITEMS);
  });

  it('removes an item', () => {
    useCompareStore.getState().addItem(item(1));
    useCompareStore.getState().addItem(item(2));
    useCompareStore.getState().removeItem(1);
    expect(useCompareStore.getState().items.map((i) => i.itemPartId)).toEqual([2]);
  });

  it('clears every item', () => {
    useCompareStore.getState().addItem(item(1));
    useCompareStore.getState().addItem(item(2));
    useCompareStore.getState().clear();
    expect(useCompareStore.getState().items).toEqual([]);
  });
});
