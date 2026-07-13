'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function ViewerLoadingState() {
  const t = useTranslations('common');
  return <div className="flex h-[100dvh] items-center justify-center">{t('loading')}</div>;
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
