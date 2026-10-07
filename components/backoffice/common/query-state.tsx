'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackofficeLoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function BackofficeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('queryState.retry')}
      </Button>
    </div>
  );
}

export function BackofficeInlineError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-destructive">{message}</p>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={onRetry}
        disabled={retrying}
      >
        {t('queryState.retry')}
      </Button>
    </div>
  );
}
