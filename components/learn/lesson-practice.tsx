'use client';

/**
 * A line of the picture to read on one's own. The attempt stays in this
 * page: it is the student's, and nothing marks it. The tutor's reading is
 * hidden until they ask for it, then shown beside theirs.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paragraphs } from '@/components/learn/lesson-walkthrough';
import { cn } from '@/lib/utils';
import type { LearnPractice } from '@/types/learn';

export function LessonPractice({
  practice,
  focused,
  onFocus,
}: {
  practice: LearnPractice;
  focused: boolean;
  onFocus: () => void;
}) {
  const t = useTranslations('learn.practice');
  const [attempt, setAttempt] = useState('');
  const [revealed, setRevealed] = useState(false);
  const hasBox = Boolean(practice.box);

  return (
    <section
      id="lesson-practice"
      aria-labelledby="lesson-practice-title"
      className={cn(
        'scroll-mt-[calc(var(--site-header-h,0px)+46svh)] space-y-3 rounded-lg border bg-card p-4 transition-shadow lg:scroll-mt-[calc(var(--site-header-h,0px)+1.5rem)]',
        focused && 'border-amber-400/70 shadow-md ring-1 ring-amber-400/30'
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="lesson-practice-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        {hasBox && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="aria-pressed:border-amber-400 aria-pressed:bg-amber-50 aria-pressed:text-amber-950 dark:aria-pressed:bg-amber-400/20 dark:aria-pressed:text-amber-100"
            onClick={onFocus}
            aria-pressed={focused}
          >
            <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
            {t('where')}
          </Button>
        )}
      </div>
      <Paragraphs text={practice.instructions} className="text-[0.95rem]" />

      <div className="space-y-1.5">
        <Label htmlFor="lesson-practice-attempt">{t('attemptLabel')}</Label>
        <textarea
          id="lesson-practice-attempt"
          value={attempt}
          onChange={(event) => setAttempt(event.target.value)}
          onFocus={() => hasBox && !focused && onFocus()}
          rows={3}
          placeholder={t('attemptPlaceholder')}
          aria-describedby="lesson-practice-hint"
          spellCheck={false}
          className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-transcription text-lg leading-snug shadow-sm placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p id="lesson-practice-hint" className="text-xs text-muted-foreground">
          {t('attemptHint')}
        </p>
      </div>

      <Button
        type="button"
        variant={revealed ? 'ghost' : 'default'}
        size="sm"
        onClick={() => setRevealed((shown) => !shown)}
        aria-expanded={revealed}
        aria-controls="lesson-practice-answer"
      >
        {revealed ? (
          <EyeOff className="mr-1.5 h-4 w-4" aria-hidden />
        ) : (
          <Eye className="mr-1.5 h-4 w-4" aria-hidden />
        )}
        {revealed ? t('hide') : t('reveal')}
      </Button>

      {revealed && (
        <div id="lesson-practice-answer" className="space-y-3 rounded-md bg-muted/40 p-3">
          {attempt.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('yours')}
              </p>
              <p className="mt-1 whitespace-pre-line font-transcription text-lg leading-snug">
                {attempt}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('answerTitle')}
            </p>
            <p className="mt-1 whitespace-pre-line font-transcription text-lg leading-snug">
              {practice.reading}
            </p>
          </div>
          {practice.note && <Paragraphs text={practice.note} className="text-sm" />}
        </div>
      )}
    </section>
  );
}
