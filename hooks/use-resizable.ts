'use client';

import * as React from 'react';

export type ResizableSize = { width: number; height?: number };

export interface UseResizableOptions {
  /** localStorage key for persisting the chosen size (optional). */
  storageKey?: string;
  defaultSize: ResizableSize;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

const KEYBOARD_STEP = 16;
const KEYBOARD_STEP_LARGE = 64;
const VIEWPORT_MARGIN = 16;

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Drag-to-resize for a floating panel. Pairs with `useDraggablePosition`
 * (which MOVES the panel via the header): the resize grip lives on a
 * bottom-right corner and never shares an element with the move handle, and
 * its handlers `stopPropagation()` so the two never interfere.
 *
 * The resized container must carry `data-resizable-panel` so the corner grip
 * can read the live rendered size as the drag baseline — this lets an
 * auto-height panel (whose height isn't in state yet) resize smoothly from its
 * current size. Size persists to `storageKey` (hydration-gated, so SSR/first
 * paint keep the component's default size and there is no layout shift).
 */
export function useResizable(options: UseResizableOptions) {
  const { storageKey, defaultSize } = options;
  const [size, setSize] = React.useState<ResizableSize>(defaultSize);
  const [hydrated, setHydrated] = React.useState(false);
  const baseRef = React.useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const clampSize = React.useCallback((w: number, h: number): ResizableSize => {
    const o = optionsRef.current;
    const vw =
      typeof window !== 'undefined'
        ? window.innerWidth - VIEWPORT_MARGIN
        : Number.POSITIVE_INFINITY;
    const vh =
      typeof window !== 'undefined'
        ? window.innerHeight - VIEWPORT_MARGIN
        : Number.POSITIVE_INFINITY;
    return {
      width: clampValue(w, o.minWidth, Math.min(o.maxWidth ?? Number.POSITIVE_INFINITY, vw)),
      height: clampValue(h, o.minHeight, Math.min(o.maxHeight ?? Number.POSITIVE_INFINITY, vh)),
    };
  }, []);

  // Hydrate the persisted size after mount; the default renders on the server
  // and first paint so there is no hydration mismatch.
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ResizableSize>;
          if (typeof parsed.width === 'number' && Number.isFinite(parsed.width)) {
            const h =
              typeof parsed.height === 'number' && Number.isFinite(parsed.height)
                ? parsed.height
                : optionsRef.current.minHeight;
            setSize(clampSize(parsed.width, h));
          }
        }
      } catch {
        // ignore malformed storage
      }
    }
    setHydrated(true);
  }, [storageKey, clampSize]);

  // Persist after hydration, once an explicit height exists (i.e. the user has
  // resized at least once); otherwise leave the auto-height default alone.
  React.useEffect(() => {
    if (!hydrated || !storageKey || typeof window === 'undefined') return;
    if (size.height == null) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(size));
    } catch {
      // ignore quota errors
    }
  }, [size, hydrated, storageKey]);

  const readBase = React.useCallback((handle: HTMLElement) => {
    const panel = handle.closest<HTMLElement>('[data-resizable-panel]');
    const o = optionsRef.current;
    return {
      w: panel?.clientWidth ?? o.defaultSize.width,
      h: panel?.clientHeight ?? o.defaultSize.height ?? o.minHeight,
    };
  }, []);

  const bindResize = React.useMemo(
    () => ({
      tabIndex: 0,
      role: 'slider' as const,
      'aria-label': 'Resize panel — drag, or use the arrow keys',
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        e.stopPropagation();
        const { w, h } = readBase(e.currentTarget);
        baseRef.current = { x: e.clientX, y: e.clientY, w, h };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const base = baseRef.current;
        if (!base) return;
        setSize(clampSize(base.w + (e.clientX - base.x), base.h + (e.clientY - base.y)));
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        baseRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget) return;
        const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        let dw = 0;
        let dh = 0;
        switch (e.key) {
          case 'ArrowRight':
            dw = step;
            break;
          case 'ArrowLeft':
            dw = -step;
            break;
          case 'ArrowDown':
            dh = step;
            break;
          case 'ArrowUp':
            dh = -step;
            break;
          default:
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        // Accumulate from state; fall back to the live DOM height only for the
        // first nudge of an auto-height panel (state height not set yet).
        const domHeight = readBase(e.currentTarget).h;
        setSize((prev) => clampSize(prev.width + dw, (prev.height ?? domHeight) + dh));
      },
    }),
    [clampSize, readBase]
  );

  return { size, setSize, bindResize };
}
