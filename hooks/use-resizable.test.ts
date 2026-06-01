import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResizable } from './use-resizable';

function pointerTarget() {
  // closest() === null → readBase falls back to defaultSize/min, keeping tests
  // deterministic without a real DOM tree.
  return {
    closest: () => null,
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  };
}

type T = ReturnType<typeof pointerTarget>;
function down(x: number, y: number, t: T) {
  return {
    clientX: x,
    clientY: y,
    pointerId: 1,
    currentTarget: t,
    stopPropagation: vi.fn(),
  } as never;
}
function move(x: number, y: number) {
  return { clientX: x, clientY: y } as never;
}
function key(k: string, shiftKey = false) {
  const t = pointerTarget();
  return {
    key: k,
    shiftKey,
    target: t,
    currentTarget: t,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as never;
}

beforeEach(() => {
  window.innerWidth = 1200;
  window.innerHeight = 900;
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('useResizable', () => {
  const base = { defaultSize: { width: 380 }, minWidth: 300, minHeight: 220 };

  it('exposes a focusable, labelled grip', () => {
    const { result } = renderHook(() => useResizable(base));
    expect(result.current.bindResize.tabIndex).toBe(0);
    expect(result.current.bindResize.role).toBe('slider');
    expect(result.current.bindResize['aria-label']).toMatch(/resize/i);
  });

  it('resizes from the current size on pointer drag', () => {
    const { result } = renderHook(() => useResizable(base));
    const t = pointerTarget();
    act(() => result.current.bindResize.onPointerDown(down(500, 500, t)));
    act(() => result.current.bindResize.onPointerMove(move(600, 620)));
    // width 380 + 100; height baseline = minHeight 220 (auto) + 120
    expect(result.current.size).toEqual({ width: 480, height: 340 });
  });

  it('clamps to the minimum size', () => {
    const { result } = renderHook(() => useResizable(base));
    const t = pointerTarget();
    act(() => result.current.bindResize.onPointerDown(down(500, 500, t)));
    act(() => result.current.bindResize.onPointerMove(move(100, 100)));
    expect(result.current.size).toEqual({ width: 300, height: 220 });
  });

  it('clamps to the viewport (minus a margin)', () => {
    const { result } = renderHook(() => useResizable(base));
    const t = pointerTarget();
    act(() => result.current.bindResize.onPointerDown(down(0, 0, t)));
    act(() => result.current.bindResize.onPointerMove(move(9999, 9999)));
    expect(result.current.size.width).toBe(window.innerWidth - 16);
    expect(result.current.size.height).toBe(window.innerHeight - 16);
  });

  it('honors an explicit maxWidth/maxHeight below the viewport', () => {
    const { result } = renderHook(() => useResizable({ ...base, maxWidth: 500, maxHeight: 400 }));
    const t = pointerTarget();
    act(() => result.current.bindResize.onPointerDown(down(0, 0, t)));
    act(() => result.current.bindResize.onPointerMove(move(9999, 9999)));
    expect(result.current.size).toEqual({ width: 500, height: 400 });
  });

  it('resizes by a step on arrow keys (shift = larger)', () => {
    const { result } = renderHook(() => useResizable(base));
    act(() => result.current.bindResize.onKeyDown(key('ArrowRight')));
    expect(result.current.size.width).toBe(396); // 380 + 16
    act(() => result.current.bindResize.onKeyDown(key('ArrowRight', true)));
    expect(result.current.size.width).toBe(460); // 396 + 64
  });

  it('persists to localStorage after a resize and rehydrates on mount', () => {
    const opts = { ...base, storageKey: 'test:panelSize' };
    const first = renderHook(() => useResizable(opts));
    const t = pointerTarget();
    act(() => first.result.current.bindResize.onPointerDown(down(500, 500, t)));
    act(() => first.result.current.bindResize.onPointerMove(move(700, 700)));
    expect(JSON.parse(window.localStorage.getItem('test:panelSize')!)).toEqual({
      width: 580,
      height: 420,
    });

    const second = renderHook(() => useResizable(opts));
    expect(second.result.current.size).toEqual({ width: 580, height: 420 });
  });
});
