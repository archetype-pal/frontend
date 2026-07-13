'use client';

import { useTranslations } from 'next-intl';
import { EntitySegmentError } from '@/components/page/entity-segment-error';

export default function ManuscriptError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('manuscript.loadError');
  return (
    <EntitySegmentError
      scope="manuscripts"
      error={error}
      reset={reset}
      fallbackMessage={t('message')}
      backLabel={t('backLink')}
    />
  );
}
