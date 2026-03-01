'use client';

import { useEffect } from 'react';
import { EntityErrorState } from '@/components/page/entity-error-state';

export default function HandError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[hands]', error.message);
    }
  }, [error]);

  return (
    <EntityErrorState
      message={error.message || 'This hand could not be loaded. Please try again.'}
      reset={reset}
      backHref="/search/manuscripts"
      backLabel="Back to search"
    />
  );
}
