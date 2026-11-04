'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MLJobStatus } from '@/types/backoffice';

/** The ledger's statuses, in the order a call moves through them, then its two other ends. */
export const ML_JOB_STATUSES: readonly MLJobStatus[] = [
  'succeeded',
  'failed',
  'refused',
  'running',
  'pending',
];

export function JobStatusBadge({ status }: { status: MLJobStatus }) {
  const t = useTranslations('backoffice.mlJobs');
  return (
    <Badge
      variant={status === 'succeeded' ? 'default' : status === 'failed' ? 'destructive' : 'outline'}
      className={cn(
        'whitespace-nowrap',
        status === 'refused' && 'border-amber-500/60 text-amber-800 dark:text-amber-300'
      )}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}
