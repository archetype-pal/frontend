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

import {
  ageInReviewMs,
  formatReviewAge,
  slaSeverity,
  type ReviewQueueItem,
} from '@/lib/backoffice/review-queue-sla';
import { cn } from '@/lib/utils';

const SEVERITY_CLASS = {
  fresh: 'border-muted bg-background text-muted-foreground',
  warning:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/40 dark:text-amber-100',
  overdue:
    'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700/50 dark:bg-rose-900/40 dark:text-rose-100',
};

export interface ReviewAgeBadgeProps {
  item: ReviewQueueItem;
  /** Override "now" for stable tests / time-travel views. */
  now?: number;
  className?: string;
}

export function ReviewAgeBadge({ item, now, className }: ReviewAgeBadgeProps) {
  const age = ageInReviewMs(item, now);
  if (age === null) return null;
  const severity = slaSeverity(age);

  return (
    <span
      data-severity={severity}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums',
        SEVERITY_CLASS[severity],
        className
      )}
      title={`In review for ${formatReviewAge(age)}`}
    >
      <Clock aria-hidden className="h-2.5 w-2.5" />
      {formatReviewAge(age)}
    </span>
  );
}
