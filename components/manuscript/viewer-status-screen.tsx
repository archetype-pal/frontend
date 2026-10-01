'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Same frame as the loaded viewer: the annotation header bar over the dark
// image canvas, so nothing reflows when the viewer finishes loading.
export function ViewerLoadingState() {
  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1 p-4">
        <div className="flex-1 rounded-lg border border-border bg-[var(--viewer-canvas)]" />
      </div>
    </div>
  );
}

export function ViewerErrorState({ message }: { message: string }) {
  const t = useTranslations('common');
  return (
    <div className="flex h-[100dvh] items-center justify-center">
      <div className="text-center">
        <p className="text-destructive mb-4">{message}</p>
        <Button onClick={() => window.location.reload()}>{t('tryAgain')}</Button>
      </div>
    </div>
  );
}
