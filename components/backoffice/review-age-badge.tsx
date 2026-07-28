'use client';

/**
 * Phase 7.1 of ROADMAP-EDITORS-V2 — review-queue age badge.
 *
 * One row chip per queue item showing how long it's been waiting on a
 * reviewer, tinted by SLA severity (fresh / warning / overdue). Drives
 * off the cycle-212 helpers — pure data → `data-severity` data
 * attribute → tailwind colour.
 *
 * Renders nothing for items not currently in review so the column
 * stays narrow.
 */

import * as React from 'react';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  ageInReviewMs,
  slaSeverity,
  type ReviewQueueItem,
} from '@/lib/backoffice/review-queue-sla';
import { cn } from '@/lib/utils';

// Severity classes route through the `--c-severity-*` design tokens so the
// SLA palette is editable in one place. Borders use the named utility with
// an opacity modifier; foreground text needs a darker shade so it consumes
// the raw H/S channels with a tuned L.
const SEVERITY_CLASS = {
  fresh: 'border-muted bg-background text-muted-foreground',
  warning:
    'border-severity-warning/40 bg-severity-warning/15 text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_28%)] dark:border-severity-warning/50 dark:bg-severity-warning/25 dark:text-[hsl(var(--c-severity-warning-h)_var(--c-severity-warning-s)_85%)]',
  overdue:
    'border-severity-overdue/40 bg-severity-overdue/15 text-[hsl(var(--c-severity-overdue-h)_var(--c-severity-overdue-s)_32%)] dark:border-severity-overdue/50 dark:bg-severity-overdue/25 dark:text-[hsl(var(--c-severity-overdue-h)_var(--c-severity-overdue-s)_85%)]',
};

export interface ReviewAgeBadgeProps {
  item: ReviewQueueItem;
  /** Override "now" for stable tests / time-travel views. */
  now?: number;
  className?: string;
}

export function ReviewAgeBadge({ item, now, className }: ReviewAgeBadgeProps) {
  const t = useTranslations('backoffice');
  const age = ageInReviewMs(item, now);
  if (age === null) return null;
  const severity = slaSeverity(age);
  const formattedAge = formatAge(t, age);

  return (
    <span
      data-severity={severity}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums',
        SEVERITY_CLASS[severity],
        className
      )}
      title={t('reviewAge.inReviewFor', { age: formattedAge })}
    >
      <Clock aria-hidden className="h-2.5 w-2.5" />
      {formattedAge}
    </span>
  );
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Localized twin of `formatReviewAge` — same thresholds, but the unit
 * strings resolve through translation keys so they can be localized.
 */
function formatAge(t: ReturnType<typeof useTranslations>, ms: number): string {
  if (ms <= 0) return t('reviewAge.today');
  if (ms < DAY) return t('reviewAge.hours', { hours: Math.floor(ms / HOUR) });
  if (ms < WEEK) return t('reviewAge.days', { days: Math.floor(ms / DAY) });
  return t('reviewAge.weeks', { weeks: Math.floor(ms / WEEK) });
}
