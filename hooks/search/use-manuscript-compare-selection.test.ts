import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useManuscriptCompareSelection } from './use-manuscript-compare-selection';
import { MAX_COMPARE_ITEMS } from '@/stores/compare-store';

describe('useManuscriptCompareSelection', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useManuscriptCompareSelection('key'));
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it('toggles a manuscript in and out of the selection', () => {
    const { result } = renderHook(() => useManuscriptCompareSelection('key'));
    act(() => result.current.toggle(1));
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.count).toBe(1);
    act(() => result.current.toggle(1));
    expect(result.current.isSelected(1)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it(`caps the selection at ${MAX_COMPARE_ITEMS} and disables further picks`, () => {
    const { result } = renderHook(() => useManuscriptCompareSelection('key'));
    act(() => {
      for (let i = 0; i < MAX_COMPARE_ITEMS; i++) result.current.toggle(i);
    });
    expect(result.current.count).toBe(MAX_COMPARE_ITEMS);
    expect(result.current.isDisabled(999)).toBe(true);
    act(() => result.current.toggle(999));
    expect(result.current.isSelected(999)).toBe(false);
    expect(result.current.count).toBe(MAX_COMPARE_ITEMS);
  });

  it('an already-selected item is never reported as disabled (so it can be unchecked)', () => {
    const { result } = renderHook(() => useManuscriptCompareSelection('key'));
    act(() => {
      for (let i = 0; i < MAX_COMPARE_ITEMS; i++) result.current.toggle(i);
    });
    expect(result.current.isDisabled(0)).toBe(false);
  });

  it('clears the selection when resetKey changes', () => {
    const { result, rerender } = renderHook(({ key }) => useManuscriptCompareSelection(key), {
      initialProps: { key: 'search-a' },
    });
    act(() => result.current.toggle(1));
    expect(result.current.count).toBe(1);
    rerender({ key: 'search-b' });
    expect(result.current.count).toBe(0);
  });

  it('does not clear the selection on an unrelated re-render (same resetKey)', () => {
    const { result, rerender } = renderHook(({ key }) => useManuscriptCompareSelection(key), {
      initialProps: { key: 'search-a' },
    });
    act(() => result.current.toggle(1));
    rerender({ key: 'search-a' });
    expect(result.current.count).toBe(1);
  });

  it('clear() empties the selection', () => {
    const { result } = renderHook(() => useManuscriptCompareSelection('key'));
    act(() => {
      result.current.toggle(1);
      result.current.toggle(2);
    });
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });
});
