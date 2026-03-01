'use client';

import { EntitySegmentError } from '@/components/page/entity-segment-error';

export default function ManuscriptError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EntitySegmentError
      scope="manuscripts"
      error={error}
      reset={reset}
      fallbackMessage="This manuscript could not be loaded. Please try again."
      backLabel="Back to manuscripts"
    />
  );
}
