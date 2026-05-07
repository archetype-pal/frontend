import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

import { useUnsavedGuard } from './use-unsaved-guard';

function makeBeforeUnloadEvent(): BeforeUnloadEvent {
  // jsdom ships an Event constructor but no BeforeUnloadEvent. The handler
  // only touches preventDefault() and the returnValue setter, so a plain
  // Event with a writable returnValue is enough.
  const ev = new Event('beforeunload') as unknown as BeforeUnloadEvent & {
    returnValue: string;
  };
  Object.defineProperty(ev, 'returnValue', { value: 'untouched', writable: true });
  return ev;
}

describe('useUnsavedGuard beforeunload handler', () => {
  beforeEach(() => {
    // Make sure each test starts with a clean window state.
    window.history.pushState(null, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches a beforeunload handler when dirty is true', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useUnsavedGuard(true));
    const calls = addSpy.mock.calls.map(([type]) => type);
    expect(calls).toContain('beforeunload');
  });

  it('does NOT attach the beforeunload handler when dirty is false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useUnsavedGuard(false));
    const calls = addSpy.mock.calls.map(([type]) => type);
    expect(calls).not.toContain('beforeunload');
  });

  it('preventDefault AND sets returnValue so Safari/older Chrome surface the dialog', () => {
    // The earlier handler only called preventDefault(). Safari and Chrome
    // <120 ignore that — they require `returnValue` to be set to a string
    // before the leave-page dialog appears. The fix sets both.
    renderHook(() => useUnsavedGuard(true));
    const ev = makeBeforeUnloadEvent();
    const preventDefaultSpy = vi.spyOn(ev, 'preventDefault');
    window.dispatchEvent(ev);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(ev.returnValue).toBe('');
  });

  it('removes the beforeunload handler on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useUnsavedGuard(true));
    unmount();
    const calls = removeSpy.mock.calls.map(([type]) => type);
    expect(calls).toContain('beforeunload');
  });
});
