'use client';

import * as React from 'react';

import type { TextPanelPosition } from '@/types/annotation-viewer';

const KEYBOARD_STEP = 16;
const KEYBOARD_STEP_LARGE = 64;

export interface UseResizableTextPanelOptions {
  storageKey?: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Resizes the DOCKED text panel via a splitter between it and the canvas.
 * Unlike the floating panels this is a flex sibling, so it can't use a corner
 * grip — it gets a draggable divider. Width applies when docked left/right,
 * height when docked bottom. The sign flips encode the dock geometry, including
 * the left-dock case where the layout uses `md:flex-row-reverse` so the panel
 * sits to the LEFT of the canvas (dragging right grows it). Width/height are
 * tracked independently and persisted together so switching dock side keeps
 * each axis's chosen size.
 */
export function useResizableTextPanel(
  position: TextPanelPosition,
  options: UseResizableTextPanelOptions
) {
  const { storageKey } = options;
  const [dims, setDims] = React.useState({
    width: options.defaultWidth,
    height: options.defaultHeight,
  });
  const [hydrated, setHydrated] = React.useState(false);
  const dragRef = React.useRef<{ start: number; base: number } | null>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const isBottom = position === 'bottom';

  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { width?: number; height?: number };
          setDims((prev) => ({
            width:
              typeof parsed.width === 'number' && Number.isFinite(parsed.width)
                ? clampValue(parsed.width, optionsRef.current.minWidth, optionsRef.current.maxWidth)
                : prev.width,
            height:
              typeof parsed.height === 'number' && Number.isFinite(parsed.height)
                ? clampValue(
                    parsed.height,
                    optionsRef.current.minHeight,
                    optionsRef.current.maxHeight
                  )
                : prev.height,
          }));
        }
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, [storageKey]);

  React.useEffect(() => {
    if (!hydrated || !storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(dims));
    } catch {
      // ignore
    }
  }, [dims, hydrated, storageKey]);

  const size = isBottom ? dims.height : dims.width;

  const applyDelta = React.useCallback(
    (rawDelta: number) => {
      const o = optionsRef.current;
      setDims((prev) =>
        isBottom
          ? { ...prev, height: clampValue(prev.height + rawDelta, o.minHeight, o.maxHeight) }
          : { ...prev, width: clampValue(prev.width + rawDelta, o.minWidth, o.maxWidth) }
      );
    },
    [isBottom]
  );

  const bindSplitter = React.useMemo(
    () => ({
      role: 'separator' as const,
      'aria-orientation': (isBottom ? 'horizontal' : 'vertical') as 'horizontal' | 'vertical',
      'aria-label': 'Resize text panel — drag, or use the arrow keys',
      tabIndex: 0,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        dragRef.current = { start: isBottom ? e.clientY : e.clientX, base: size };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!dragRef.current) return;
        const cursor = isBottom ? e.clientY : e.clientX;
        let delta = cursor - dragRef.current.start;
        // bottom: the panel is below the canvas, so dragging UP grows it.
        // right: the panel is right of the canvas, so dragging LEFT grows it.
        // left (md:flex-row-reverse): dragging RIGHT grows it → keep delta.
        if (isBottom || position === 'right') delta = -delta;
        const o = optionsRef.current;
        const next = dragRef.current.base + delta;
        setDims((prev) =>
          isBottom
            ? { ...prev, height: clampValue(next, o.minHeight, o.maxHeight) }
            : { ...prev, width: clampValue(next, o.minWidth, o.maxWidth) }
        );
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        dragRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        let delta = 0;
        if (isBottom) {
          if (e.key === 'ArrowUp') delta = step;
          else if (e.key === 'ArrowDown') delta = -step;
        } else if (e.key === 'ArrowLeft') {
          delta = position === 'right' ? step : -step;
        } else if (e.key === 'ArrowRight') {
          delta = position === 'right' ? -step : step;
        }
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation();
        applyDelta(delta);
      },
    }),
    [isBottom, position, size, applyDelta]
  );

  return { size, isBottom, bindSplitter };
}
