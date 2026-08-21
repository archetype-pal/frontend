import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSelectionSet } from './use-selection-set';

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
