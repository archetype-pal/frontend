'use client';

/**
 * The picture a lesson is about, with every place it points at drawn over it.
 *
 * The boxes are in the picture's own pixels, so the overlay's viewBox is the
 * picture's size and they scale with it however large it is shown. Each
 * step's boxes are numbered and are one control: choosing any of them
 * chooses the step. What is in focus (a step, the practice line or an answer)
 * is drawn bright and the rest faint, and the picture can close in on it, as
 * a letter is too small to read on the whole page.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ImageOff, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NO_ZOOM, boundsOf, zoomTo, type LessonFocus } from '@/lib/learn';
import { cn } from '@/lib/utils';
import type { LearnBox, LearnStep } from '@/types/learn';

type Emphasis = 'normal' | 'active' | 'selected' | 'faint';

// Fixed colours rather than the theme's: they sit on a photograph, light or dark.
const STROKE: Record<Emphasis, string> = {
  normal: '#ffffff',
  active: '#fbbf24',
  selected: '#fde047',
  faint: '#ffffff',
};
const FILL: Record<Emphasis, string> = {
  normal: 'none',
  active: 'rgba(251, 191, 36, 0.12)',
  selected: 'rgba(253, 224, 71, 0.22)',
  faint: 'none',
};

/** Picture pixels per CSS pixel before the picture is measured (and in tests). */
const FALLBACK_WIDTH = 640;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Box({
  box,
  badge,
  emphasis,
  dashed,
  px,
  title,
}: {
  box: LearnBox;
  badge: string | null;
  emphasis: Emphasis;
  dashed?: boolean;
  /** A length in CSS pixels, in picture pixels at the current size and zoom. */
  px: (n: number) => number;
  title: string;
}) {
  const faint = emphasis === 'faint';
  const radius = px(10);
  const badgeX = Math.max(radius, box.x);
  const badgeY = Math.max(radius, box.y);
  return (
    <g data-box data-emphasis={emphasis} opacity={faint ? 0.5 : 1}>
      <title>{title}</title>
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={FILL[emphasis]}
        stroke="rgba(0, 0, 0, 0.6)"
        strokeWidth={px(emphasis === 'selected' ? 5.5 : 4)}
      />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="none"
        stroke={STROKE[emphasis]}
        strokeWidth={px(emphasis === 'selected' ? 3 : 2)}
        strokeDasharray={dashed ? `${px(6)} ${px(4)}` : undefined}
      />
      {/* The keyboard's focus ring, shown only when the step's control has it. */}
      <rect
        x={box.x - px(4)}
        y={box.y - px(4)}
        width={box.width + px(8)}
        height={box.height + px(8)}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={px(2.5)}
        className="opacity-0 group-focus-visible:opacity-100"
      />
      {badge && (
        <g aria-hidden>
          <circle
            cx={badgeX}
            cy={badgeY}
            r={radius}
            fill={emphasis === 'normal' || faint ? '#ffffff' : STROKE[emphasis]}
            stroke="rgba(0, 0, 0, 0.65)"
            strokeWidth={px(1.5)}
          />
          <text
            x={badgeX}
            y={badgeY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={px(12)}
            fontWeight={700}
            fill="#111827"
            className="select-none font-sans"
          >
            {badge}
          </text>
        </g>
      )}
    </g>
  );
}

export interface LessonPictureProps {
  src: string | null;
  width: number;
  height: number;
  alt: string;
  steps: LearnStep[];
  focus: LessonFocus | null;
  /** The boxes of whatever is in focus, and the one of them chosen, if any. */
  focusBoxes: LearnBox[];
  activeBox: number | null;
  zoomed: boolean;
  onToggleZoom: () => void;
  onSelectStep: (index: number) => void;
  /** What the toolbar says is in focus. */
  caption: string;
}

export function LessonPicture({
  src,
  width,
  height,
  alt,
  steps,
  focus,
  focusBoxes,
  activeBox,
  zoomed,
  onToggleZoom,
  onSelectStep,
  caption,
}: LessonPictureProps) {
  const t = useTranslations('learn.picture');
  const [frame, frameWidth] = useWidth<HTMLDivElement>();
  const [failed, setFailed] = useState(false);

  const target =
    activeBox !== null && focusBoxes[activeBox]
      ? boundsOf([focusBoxes[activeBox]])
      : boundsOf(focusBoxes);
  const zoom = zoomed ? zoomTo(target, width, height) : NO_ZOOM;
  const unit = width / (frameWidth || FALLBACK_WIDTH);
  const px = (n: number) => (n * unit) / zoom.scale;

  const stepIndex = focus?.kind === 'step' ? focus.index : null;
  const stepCount = steps.length;
  const canZoom = focusBoxes.length > 0;

  const onKeyDown = (index: number) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectStep(index);
    }
  };

  // Non-step boxes (the practice line, an answer's places) are drawn only while in focus.
  const extra = focus && focus.kind !== 'step' ? focusBoxes : [];

  return (
    <figure className="space-y-2">
      <div
        ref={frame}
        className={cn(
          // `clip`, not `hidden`: focusing a box out of view must not scroll the frame under the zoom.
          'relative mx-auto overflow-clip rounded-md border bg-muted/60 shadow-sm',
          '[--learn-picture-h:40svh] lg:[--learn-picture-h:calc(100svh_-_var(--site-header-h,0px)_-_8rem)]'
        )}
        style={{
          aspectRatio: `${width} / ${height}`,
          width: `min(100%, calc(var(--learn-picture-h) * ${width / height}))`,
        }}
      >
        <div
          data-testid="lesson-picture-layer"
          className="absolute inset-0 origin-top-left motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
          style={{ transform: `translate(${zoom.x}%, ${zoom.y}%) scale(${zoom.scale})` }}
        >
          {src && !failed ? (
            // oxlint-disable-next-line @next/next/no-img-element -- the boxes need the picture's exact frame, with no optimiser between
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              draggable={false}
              onError={() => setFailed(true)}
              className="absolute inset-0 h-full w-full select-none"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <ImageOff className="h-6 w-6" aria-hidden />
              {t('loadError')}
            </div>
          )}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="group"
            aria-label={t('boxes')}
          >
            {steps.map((step, index) => {
              if (step.boxes.length === 0) return null;
              const active = stepIndex === index;
              const base: Emphasis = active ? 'active' : focus ? 'faint' : 'normal';
              return (
                <g
                  key={index}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={t('stepBoxes', {
                    number: index + 1,
                    title: step.title,
                    count: step.boxes.length,
                  })}
                  onClick={() => onSelectStep(index)}
                  onKeyDown={onKeyDown(index)}
                  className="group cursor-pointer outline-none"
                >
                  {step.boxes.map((box, boxIndex) => (
                    <Box
                      key={boxIndex}
                      box={box}
                      badge={String(index + 1)}
                      emphasis={active && activeBox === boxIndex ? 'selected' : base}
                      px={px}
                      title={[t('step', { number: index + 1 }), box.label || step.title]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ))}
                </g>
              );
            })}
            {extra.map((box, boxIndex) => (
              <Box
                key={`extra-${boxIndex}`}
                box={box}
                badge={extra.length > 1 ? String.fromCharCode(97 + boxIndex) : null}
                emphasis={activeBox === boxIndex ? 'selected' : 'active'}
                dashed={focus?.kind === 'practice'}
                px={px}
                title={box.label || caption}
              />
            ))}
          </svg>
        </div>
      </div>

      <figcaption className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onSelectStep(stepIndex === null ? stepCount - 1 : stepIndex - 1)}
          disabled={stepCount === 0 || stepIndex === 0}
          aria-label={t('previous')}
          title={t('previous')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-sm" aria-live="polite">
          {caption}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onSelectStep(stepIndex === null ? 0 : stepIndex + 1)}
          disabled={stepCount === 0 || stepIndex === stepCount - 1}
          aria-label={t('next')}
          title={t('next')}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-1 shrink-0"
          onClick={onToggleZoom}
          disabled={!canZoom}
        >
          {zoomed && canZoom ? (
            <ZoomOut className="mr-1.5 h-4 w-4" aria-hidden />
          ) : (
            <ZoomIn className="mr-1.5 h-4 w-4" aria-hidden />
          )}
          {zoomed && canZoom ? t('zoomOut') : t('zoomIn')}
        </Button>
      </figcaption>
    </figure>
  );
}
