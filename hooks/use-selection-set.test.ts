import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRangeSelect, useSelectionSet } from './use-selection-set';

describe('useSelectionSet', () => {
  it('starts with an empty set', () => {
    const { result } = renderHook(() => useSelectionSet<number>());
    expect(result.current.selected.size).toBe(0);
  });

  it('toggles an item in and out of the set', () => {
    const { result } = renderHook(() => useSelectionSet<number>());

    act(() => {
      result.current.toggle(10);
    });
    expect(result.current.selected.has(10)).toBe(true);
    expect(result.current.selected.size).toBe(1);

    act(() => {
      result.current.toggle(10);
    });
    expect(result.current.selected.has(10)).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it('adds multiple items with addMany', () => {
    const { result } = renderHook(() => useSelectionSet<number>());

    act(() => {
      result.current.addMany([1, 2, 3]);
    });
    expect(result.current.selected.size).toBe(3);
    expect(Array.from(result.current.selected)).toEqual([1, 2, 3]);
  });

  it('removes multiple items with removeMany', () => {
    const { result } = renderHook(() => useSelectionSet<number>());

    act(() => {
      result.current.addMany([1, 2, 3, 4]);
    });
    act(() => {
      result.current.removeMany([2, 4]);
    });
    expect(result.current.selected.size).toBe(2);
    expect(Array.from(result.current.selected)).toEqual([1, 3]);
  });

  it('clears all selected items', () => {
    const { result } = renderHook(() => useSelectionSet<number>());

    act(() => {
      result.current.addMany([1, 2, 3]);
    });
    expect(result.current.selected.size).toBe(3);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selected.size).toBe(0);
  });
});

describe('useRangeSelect', () => {
  function setup() {
    return renderHook(() => {
      const selection = useSelectionSet<number>();
      return { selection, select: useRangeSelect(selection) };
    });
  }
  const selectedIds = (set: Set<number>) => Array.from(set).sort((a, b) => a - b);

  it('toggles one id on a plain click', () => {
    const { result } = setup();

    act(() => result.current.select([1, 2, 3], 2, false));
    expect(selectedIds(result.current.selection.selected)).toEqual([2]);

    act(() => result.current.select([1, 2, 3], 2, false));
    expect(selectedIds(result.current.selection.selected)).toEqual([]);
  });

  it('adds every id between the last click and a shift click, in either direction', () => {
    const { result } = setup();
    const ids = [1, 2, 3, 4, 5];

    act(() => result.current.select(ids, 4, false));
    act(() => result.current.select(ids, 2, true));

    expect(selectedIds(result.current.selection.selected)).toEqual([2, 3, 4]);
  });

  it('only toggles on a shift click when the last click was in another list', () => {
    const { result } = setup();

    act(() => result.current.select([1, 2, 3], 1, false));
    act(() => result.current.select([7, 8, 9], 9, true));

    expect(selectedIds(result.current.selection.selected)).toEqual([1, 9]);
  });
});
