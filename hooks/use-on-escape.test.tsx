import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOnEscape } from './use-on-escape';

function pressEscape(): boolean {
  const ev = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
  return window.dispatchEvent(ev);
}

describe('useOnEscape', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the handler on Escape when active', () => {
    const handler = vi.fn();
    renderHook(() => useOnEscape(true, handler));
    pressEscape();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when inactive', () => {
    const handler = vi.fn();
    renderHook(() => useOnEscape(false, handler));
    pressEscape();
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores non-Escape keys', () => {
    const handler = vi.fn();
    renderHook(() => useOnEscape(true, handler));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useOnEscape(true, h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    pressEscape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('detaches the listener when deactivated', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(({ active }) => useOnEscape(active, handler), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    pressEscape();
    expect(handler).not.toHaveBeenCalled();
  });
});
