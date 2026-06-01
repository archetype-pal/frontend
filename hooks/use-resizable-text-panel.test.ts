import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useResizableTextPanel } from './use-resizable-text-panel';
import type { TextPanelPosition } from '@/types/annotation-viewer';

function target() {
  return { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() };
}
function down(coord: number, t: ReturnType<typeof target>) {
  // The hook reads clientX for side docks and clientY for the bottom dock; set both.
  return { clientX: coord, clientY: coord, pointerId: 1, currentTarget: t } as never;
}
function move(coord: number) {
  return { clientX: coord, clientY: coord } as never;
}

const OPTS = {
  defaultWidth: 544,
  defaultHeight: 320,
  minWidth: 320,
  maxWidth: 900,
  minHeight: 160,
  maxHeight: 700,
};

function setup(position: TextPanelPosition) {
  return renderHook(() => useResizableTextPanel(position, OPTS));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useResizableTextPanel dock geometry', () => {
  it('right dock: dragging the splitter left grows the panel width', () => {
    const { result } = setup('right');
    expect(result.current.size).toBe(544);
    const t = target();
    act(() => result.current.bindSplitter.onPointerDown(down(800, t)));
    act(() => result.current.bindSplitter.onPointerMove(move(700))); // 100px left
    expect(result.current.size).toBe(644);
  });

  it('left dock: dragging the splitter right grows the panel width', () => {
    const { result } = setup('left');
    const t = target();
    act(() => result.current.bindSplitter.onPointerDown(down(500, t)));
    act(() => result.current.bindSplitter.onPointerMove(move(600))); // 100px right
    expect(result.current.size).toBe(644);
  });

  it('bottom dock: dragging the splitter up grows the panel height', () => {
    const { result } = setup('bottom');
    expect(result.current.size).toBe(320);
    const t = target();
    act(() => result.current.bindSplitter.onPointerDown(down(500, t)));
    act(() => result.current.bindSplitter.onPointerMove(move(400))); // 100px up
    expect(result.current.size).toBe(420);
    expect(result.current.bindSplitter['aria-orientation']).toBe('horizontal');
  });

  it('clamps width to [min, max]', () => {
    const { result } = setup('right');
    const t = target();
    // Right dock: dragging the splitter far LEFT grows past the max.
    act(() => result.current.bindSplitter.onPointerDown(down(800, t)));
    act(() => result.current.bindSplitter.onPointerMove(move(-9999)));
    expect(result.current.size).toBe(900);
    // ...and far RIGHT shrinks past the min.
    act(() => result.current.bindSplitter.onPointerDown(down(800, t)));
    act(() => result.current.bindSplitter.onPointerMove(move(9999)));
    expect(result.current.size).toBe(320);
  });

  it('keyboard arrows resize with correct direction per dock', () => {
    const right = setup('right');
    act(() =>
      right.result.current.bindSplitter.onKeyDown({
        key: 'ArrowLeft',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as never)
    );
    expect(right.result.current.size).toBe(560); // 544 + 16

    const bottom = setup('bottom');
    act(() =>
      bottom.result.current.bindSplitter.onKeyDown({
        key: 'ArrowUp',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as never)
    );
    expect(bottom.result.current.size).toBe(336); // 320 + 16
  });

  it('persists width + height together and rehydrates', () => {
    const opts = { ...OPTS, storageKey: 'test:textPanelSize' };
    const first = renderHook(() => useResizableTextPanel('right', opts));
    const t = target();
    act(() => first.result.current.bindSplitter.onPointerDown(down(800, t)));
    act(() => first.result.current.bindSplitter.onPointerMove(move(750))); // width → 594
    const stored = JSON.parse(window.localStorage.getItem('test:textPanelSize')!);
    expect(stored.width).toBe(594);
    expect(stored.height).toBe(320);

    const second = renderHook(() => useResizableTextPanel('right', opts));
    expect(second.result.current.size).toBe(594);
  });
});
