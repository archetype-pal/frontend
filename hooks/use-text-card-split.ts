'use client';

import * as React from 'react';

const STORAGE_KEY = 'viewerTextCardSplit';
const MIN = 0.2;
const MAX = 0.8;
const STEP = 0.04;
const STEP_LARGE = 0.1;

const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));

interface Ratios {
  row: number;
  column: number;
}

/**
 * Ratio-based resizer for the two stacked/side-by-side text cards. The cards
 * divide the panel's main axis by `flex-grow`, so the split stays proportional
 * as the panel itself is resized. The ratio is the first card's share (0.2–0.8)
 * and is tracked per orientation (row = side-by-side, column = stacked) so each
 * dock keeps its own chosen split. Drag the divider, or use the arrow keys.
 */
export function useTextCardSplit(orientation: 'row' | 'column') {
  const vertical = orientation === 'column'; // stacked cards → divider drags vertically
  const [ratios, setRatios] = React.useState<Ratios>({ row: 0.5, column: 0.5 });
  const [hydrated, setHydrated] = React.useState(false);
  const drag = React.useRef<{ start: number; base: number; size: number } | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Ratios>;
        setRatios((prev) => ({
          row:
            typeof parsed.row === 'number' && Number.isFinite(parsed.row)
              ? clamp(parsed.row)
              : prev.row,
          column:
            typeof parsed.column === 'number' && Number.isFinite(parsed.column)
              ? clamp(parsed.column)
              : prev.column,
        }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ratios));
    } catch {
      // ignore
    }
  }, [ratios, hydrated]);

  const ratio = vertical ? ratios.column : ratios.row;
  const setRatio = React.useCallback(
    (next: number) => {
      setRatios((prev) =>
        vertical ? { ...prev, column: clamp(next) } : { ...prev, row: clamp(next) }
      );
    },
    [vertical]
  );

  const bindSplitter = React.useMemo(
    () => ({
      role: 'separator' as const,
      'aria-orientation': (vertical ? 'horizontal' : 'vertical') as 'horizontal' | 'vertical',
      'aria-label': 'Resize the two text panels — drag, or use the arrow keys',
      'aria-valuenow': Math.round(ratio * 100),
      'aria-valuemin': Math.round(MIN * 100),
      'aria-valuemax': Math.round(MAX * 100),
      tabIndex: 0,
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
        const size = rect ? (vertical ? rect.height : rect.width) : 0;
        drag.current = { start: vertical ? e.clientY : e.clientX, base: ratio, size: size || 1 };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (!drag.current) return;
        const cursor = vertical ? e.clientY : e.clientX;
        const delta = (cursor - drag.current.start) / drag.current.size;
        setRatio(drag.current.base + delta);
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        const step = e.shiftKey ? STEP_LARGE : STEP;
        let delta = 0;
        if (vertical) {
          if (e.key === 'ArrowUp') delta = -step;
          else if (e.key === 'ArrowDown') delta = step;
        } else if (e.key === 'ArrowLeft') delta = -step;
        else if (e.key === 'ArrowRight') delta = step;
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation();
        setRatio(ratio + delta);
      },
    }),
    [vertical, ratio, setRatio]
  );

  return { ratio, bindSplitter };
}
