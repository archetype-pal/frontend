'use client';

/**
 * Why the tutor would not do what was asked: a heading in the student's
 * language for the kind of refusal, and under it the API's own words, which
 * say exactly what to do (sign in, wait, send a smaller picture).
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { learnFailure } from '@/lib/learn';
import { useRefusalWords } from '@/lib/refusal';
import { LearnError } from '@/services/learn';

export function LearnRefusal({ error, className }: { error: unknown; className?: string }) {
  const t = useTranslations('learn.failure');
  const refusalWords = useRefusalWords();
  const detail = error instanceof LearnError ? refusalWords(error.code, error.detail) : '';
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>{t(learnFailure(error))}</AlertTitle>
      {detail && <AlertDescription>{detail}</AlertDescription>}
    </Alert>
  );
}
