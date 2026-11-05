'use client';

/**
 * The lesson itself: what the hand is, why the tutor thinks so, and the steps
 * that teach it. Model output, so shown as text, never as markup. Choosing a
 * step opens it and brings its places forward on the picture; choosing one
 * of its places closes in on that one.
 */

import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, ChevronLeft, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GlyphExamples } from '@/components/learn/glyph-examples';
import { citedGlyphs, paragraphs } from '@/lib/learn';
import { cn } from '@/lib/utils';
import type { LearnGlyph, LearnStep, LearnWalkthrough } from '@/types/learn';

export function Paragraphs({ text, className }: { text: string | undefined; className?: string }) {
  return (
    <>
      {paragraphs(text).map((paragraph, index) => (
        <p key={index} className={cn('whitespace-pre-line leading-relaxed', className)}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

export function LessonOverview({ walkthrough }: { walkthrough: LearnWalkthrough }) {
  const t = useTranslations('learn');
  const script = walkthrough.script;
  const reasons = script?.reasons ?? [];
  return (
    <>
      {walkthrough.overview && (
        <section aria-labelledby="lesson-overview" className="space-y-3">
          <h2 id="lesson-overview" className="text-lg font-semibold">
            {t('overview')}
          </h2>
          <Paragraphs text={walkthrough.overview} />
        </section>
      )}
      {script && (script.name || reasons.length > 0) && (
        <section aria-labelledby="lesson-script" className="rounded-lg border bg-muted/30 p-4">
          <h2
            id="lesson-script"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t('script.title')}
          </h2>
          {script.name && <p className="mt-1 font-serif text-xl font-semibold">{script.name}</p>}
          {script.date && <p className="text-sm text-muted-foreground">{script.date}</p>}
          {reasons.length > 0 && (
            <>
              <p className="mt-3 text-sm font-semibold">{t('script.reasons')}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}

function StepCard({
  step,
  index,
  count,
  open,
  activeBox,
  glyphs,
  pageId,
  hasPractice,
  onSelectStep,
  onSelectBox,
  onPractice,
}: {
  step: LearnStep;
  index: number;
  count: number;
  open: boolean;
  activeBox: number | null;
  glyphs: Record<string, LearnGlyph> | undefined;
  pageId: number | null;
  hasPractice: boolean;
  onSelectStep: (index: number | null) => void;
  onSelectBox: (index: number | null) => void;
  onPractice: () => void;
}) {
  const t = useTranslations('learn.steps');
  const number = index + 1;
  const bodyId = `lesson-step-${index}-body`;
  const examples = citedGlyphs(step.example_glyph_ids, glyphs);

  return (
    <li
      id={`lesson-step-${index}`}
      className={cn(
        'scroll-mt-[calc(var(--site-header-h,0px)+46svh)] rounded-lg border bg-card transition-shadow lg:scroll-mt-[calc(var(--site-header-h,0px)+1.5rem)]',
        open && 'border-amber-400/70 shadow-md ring-1 ring-amber-400/30'
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onSelectStep(open ? null : index)}
          className="flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              open ? 'bg-amber-400 text-gray-900' : 'bg-muted text-foreground'
            )}
            aria-hidden
          >
            {number}
          </span>
          <span className="min-w-0 flex-1 pt-0.5 font-medium leading-snug">
            <span className="sr-only">{t('step', { number })}: </span>
            {step.title || t('step', { number })}
          </span>
          {step.character && (
            <span className="shrink-0 rounded border bg-background px-1.5 font-transcription text-lg leading-7 text-primary">
              <span className="sr-only">{t('character')}: </span>
              {step.character}
            </span>
          )}
          <ChevronDown
            className={cn(
              'mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </h3>
      {open && (
        <div id={bodyId} className="space-y-4 border-t px-4 pb-4 pt-3 text-[0.95rem]">
          <Paragraphs text={step.explanation} />

          {step.boxes.length > 0 && (
            <div>
              <p className="text-sm font-semibold">{t('places')}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {step.boxes.map((box, boxIndex) => {
                  const chosen = activeBox === boxIndex;
                  return (
                    <li key={boxIndex}>
                      <button
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => onSelectBox(chosen ? null : boxIndex)}
                        className={cn(
                          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          chosen
                            ? 'border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100'
                            : 'hover:border-amber-400/70 hover:bg-amber-50 dark:hover:bg-amber-400/10'
                        )}
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          {box.label || t('placeLabel', { number: boxIndex + 1 })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step.look_for.length > 0 && (
            <div>
              <p className="text-sm font-semibold">{t('lookFor')}</p>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {step.look_for.map((cue, cueIndex) => (
                  <li key={cueIndex} className="flex gap-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                      aria-hidden
                    />
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <GlyphExamples glyphs={examples} title={t('examples')} pageId={pageId} />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {index > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectStep(index - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                {t('previous')}
              </Button>
            ) : (
              <span />
            )}
            {index < count - 1 ? (
              <Button type="button" size="sm" onClick={() => onSelectStep(index + 1)}>
                {t('next')}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              hasPractice && (
                <Button type="button" size="sm" onClick={onPractice}>
                  {t('toPractice')}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function LessonSteps({
  steps,
  glyphs,
  pageId,
  openStep,
  activeBox,
  hasPractice,
  onSelectStep,
  onSelectBox,
  onPractice,
}: {
  steps: LearnStep[];
  glyphs: Record<string, LearnGlyph> | undefined;
  /** The lesson's corpus page, whose own glyphs are marked among the examples; null for an upload. */
  pageId: number | null;
  openStep: number | null;
  activeBox: number | null;
  hasPractice: boolean;
  onSelectStep: (index: number | null) => void;
  onSelectBox: (index: number | null) => void;
  onPractice: () => void;
}) {
  const t = useTranslations('learn.steps');
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="lesson-steps" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lesson-steps" className="text-lg font-semibold">
          {t('title')}
        </h2>
        {openStep === null && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => onSelectStep(0)}
          >
            {t('begin')}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <StepCard
            key={index}
            step={step}
            index={index}
            count={steps.length}
            open={openStep === index}
            activeBox={openStep === index ? activeBox : null}
            glyphs={glyphs}
            pageId={pageId}
            hasPractice={hasPractice}
            onSelectStep={onSelectStep}
            onSelectBox={onSelectBox}
            onPractice={onPractice}
          />
        ))}
      </ol>
    </section>
  );
}
