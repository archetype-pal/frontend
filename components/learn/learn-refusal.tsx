'use client';

/**
 * Why the tutor would not do what was asked: a heading in the student's
 * language for the kind of refusal, and under it the API's own words, which
 * say exactly what to do (sign in, wait until tomorrow, send a smaller picture).
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { learnDetail, learnFailure } from '@/lib/learn';

export function LearnRefusal({ error, className }: { error: unknown; className?: string }) {
  const t = useTranslations('learn.failure');
  const detail = learnDetail(error);
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>{t(learnFailure(error))}</AlertTitle>
      {detail && <AlertDescription>{detail}</AlertDescription>}
    </Alert>
  );
}
