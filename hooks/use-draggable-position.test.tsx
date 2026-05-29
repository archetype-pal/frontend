import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDraggablePosition } from './use-draggable-position';

type KeyArgs = { key: string; shiftKey?: boolean };

function keyEvent({ key, shiftKey = false }: KeyArgs) {
  const target = {};
  return {
    key,
    shiftKey,
    // target === currentTarget → the handle itself has focus.
    target,
    currentTarget: target,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLElement>;
}

describe('useDraggablePosition keyboard nudging', () => {
  it('exposes a focusable, labelled drag handle', () => {
    const { result } = renderHook(() => useDraggablePosition({ x: 0, y: 0 }));
    expect(result.current.bindDrag.tabIndex).toBe(0);
    expect(result.current.bindDrag['aria-label']).toMatch(/arrow keys/i);
  });

  it('moves by a step on arrow keys', () => {
    const { result } = renderHook(() => useDraggablePosition({ x: 100, y: 100 }));
    act(() => result.current.bindDrag.onKeyDown(keyEvent({ key: 'ArrowRight' })));
    expect(result.current.pos).toEqual({ x: 112, y: 100 });
    act(() => result.current.bindDrag.onKeyDown(keyEvent({ key: 'ArrowUp' })));
    expect(result.current.pos).toEqual({ x: 112, y: 88 });
  });

  it('jumps further with Shift', () => {
    const { result } = renderHook(() => useDraggablePosition({ x: 0, y: 0 }));
    act(() => result.current.bindDrag.onKeyDown(keyEvent({ key: 'ArrowDown', shiftKey: true })));
    expect(result.current.pos).toEqual({ x: 0, y: 60 });
  });

  it('ignores non-arrow keys and keys from nested controls', () => {
    const { result } = renderHook(() => useDraggablePosition({ x: 5, y: 5 }));
    act(() => result.current.bindDrag.onKeyDown(keyEvent({ key: 'Enter' })));
    expect(result.current.pos).toEqual({ x: 5, y: 5 });

    // A keydown bubbling up from a child button (target !== currentTarget).
    const nested = {
      key: 'ArrowRight',
      shiftKey: false,
      target: {},
      currentTarget: {},
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => result.current.bindDrag.onKeyDown(nested));
    expect(result.current.pos).toEqual({ x: 5, y: 5 });
  });
});
