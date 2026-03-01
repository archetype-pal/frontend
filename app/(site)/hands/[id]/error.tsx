'use client';

import { EntitySegmentError } from '@/components/page/entity-segment-error';

export default function HandError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EntitySegmentError
      scope="hands"
      error={error}
      reset={reset}
      fallbackMessage="This hand could not be loaded. Please try again."
      backLabel="Back to search"
    />
  );
}
