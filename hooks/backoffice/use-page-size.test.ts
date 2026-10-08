import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePageSize } from './use-page-size';

describe('usePageSize', () => {
  afterEach(() => window.localStorage.clear());

  it('starts at the fallback and remembers a change for the next visit', () => {
    const first = renderHook(() => usePageSize('hands', 20));
    expect(first.result.current[0]).toBe(20);

    act(() => first.result.current[1](50));
    expect(first.result.current[0]).toBe(50);
    first.unmount();

    expect(renderHook(() => usePageSize('hands', 20)).result.current[0]).toBe(50);
  });

  it('keeps each table separate and ignores sizes the pager does not offer', () => {
    window.localStorage.setItem('backoffice-page-size:scribes', '37');

    expect(renderHook(() => usePageSize('scribes', 20)).result.current[0]).toBe(20);
    expect(renderHook(() => usePageSize('users', 50)).result.current[0]).toBe(50);
  });

  it('keeps an unnamed table to the current view', () => {
    const { result } = renderHook(() => usePageSize(null, 20));

    act(() => result.current[1](100));

    expect(result.current[0]).toBe(100);
    expect(window.localStorage.length).toBe(0);
  });
});
