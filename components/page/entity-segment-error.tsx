'use client';

import { useEffect } from 'react';
import { EntityErrorState } from '@/components/page/entity-error-state';

export function EntitySegmentError({
  scope,
  error,
  reset,
  fallbackMessage,
  backLabel,
}: {
  scope: string;
  error: Error & { digest?: string };
  reset: () => void;
  fallbackMessage: string;
  backLabel: string;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${scope}]`, error.message);
    }
  }, [scope, error]);

  return (
    <EntityErrorState
      message={error.message || fallbackMessage}
      reset={reset}
      backHref="/search/manuscripts"
      backLabel={backLabel}
    />
  );
}
