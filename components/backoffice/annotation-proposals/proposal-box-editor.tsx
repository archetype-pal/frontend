'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { dragBox, type BoxHandle, type PageBox } from '@/lib/backoffice/proposal-box';
import { getIiifImageUrl } from '@/utils/iiif';

/** The longer side of the editor, in CSS pixels. */
const VIEW = 360;

const HANDLES: { handle: Exclude<BoxHandle, 'move'>; className: string }[] = [
  { handle: 'nw', className: 'left-0 top-0 cursor-nwse-resize' },
  { handle: 'n', className: 'left-1/2 top-0 cursor-ns-resize' },
  { handle: 'ne', className: 'left-full top-0 cursor-nesw-resize' },
  { handle: 'e', className: 'left-full top-1/2 cursor-ew-resize' },
  { handle: 'se', className: 'left-full top-full cursor-nwse-resize' },
  { handle: 's', className: 'left-1/2 top-full cursor-ns-resize' },
  { handle: 'sw', className: 'left-0 top-full cursor-nesw-resize' },
  { handle: 'w', className: 'left-0 top-1/2 cursor-ew-resize' },
];

interface Drag {
  handle: BoxHandle;
  pointerX: number;
  pointerY: number;
  start: PageBox;
}

/**
 * The page round a proposed box, with the box to drag into place.
 *
 * Drag inside the box to move it, or an edge or corner to resize it. With the
 * box focused, the arrow keys move it a pixel (ten with Shift), and with Alt
 * they move its right and bottom edges. `region` stays fixed while editing, so
 * the page does not shift under the pointer.
 */
export function ProposalBoxEditor({
  infoUrl,
  region,
  box,
  onChange,
  label,
}: {
  infoUrl: string;
  region: PageBox;
  box: PageBox;
  onChange: (box: PageBox) => void;
  label: string;
}) {
  const t = useTranslations('backoffice.annotationProposals');
  const drag = useRef<Drag | null>(null);
  const scale = VIEW / Math.max(region.w, region.h);
  const src = getIiifImageUrl(infoUrl, { coordinates: region, maxSize: VIEW * 2 });

  const begin = (handle: BoxHandle) => (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { handle, pointerX: event.clientX, pointerY: event.clientY, start: box };
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = (event.clientX - current.pointerX) / scale;
    const dy = (event.clientY - current.pointerY) / scale;
    onChange(dragBox(current.start, current.handle, dx, dy, region));
  };

  const end = () => {
    drag.current = null;
  };

  const nudge = (event: React.KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const [dx, dy] = delta;
    onChange(dragBox(box, event.altKey ? (dx ? 'e' : 's') : 'move', dx, dy, region));
  };

  const percent = (value: number, of: number) => `${(value / of) * 100}%`;

  return (
    <div className="space-y-1.5">
      <div
        className="relative mx-auto touch-none select-none overflow-hidden rounded-md border bg-muted"
        style={{ width: Math.round(region.w * scale), height: Math.round(region.h * scale) }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <Image
          src={src}
          alt={label}
          fill
          unoptimized
          draggable={false}
          sizes={`${VIEW}px`}
          className="pointer-events-none object-fill"
        />
        <div
          role="group"
          tabIndex={0}
          aria-label={t('boxEditorLabel')}
          aria-describedby="proposal-box-editor-hint"
          data-testid="proposal-box-editor-box"
          onPointerDown={begin('move')}
          onKeyDown={nudge}
          className="absolute cursor-move rounded-[1px] border-2 border-amber-400 shadow-[0_0_0_1px_rgba(0,0,0,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{
            left: percent(box.x - region.x, region.w),
            top: percent(box.y - region.y, region.h),
            width: percent(box.w, region.w),
            height: percent(box.h, region.h),
          }}
        >
          {HANDLES.map(({ handle, className }) => (
            <span
              key={handle}
              aria-hidden
              data-handle={handle}
              onPointerDown={begin(handle)}
              className={cn(
                'absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-black/60 bg-white',
                className
              )}
            />
          ))}
        </div>
      </div>
      <p id="proposal-box-editor-hint" className="text-center text-xs text-muted-foreground">
        {t('boxEditorHint')}
      </p>
    </div>
  );
}
