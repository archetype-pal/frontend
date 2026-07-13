'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type EntityErrorStateProps = {
  title?: string;
  message: string;
  reset?: () => void;
  backHref: string;
  backLabel: string;
};

export function EntityErrorState({
  title: titleProp,
  message,
  reset,
  backHref,
  backLabel,
}: EntityErrorStateProps) {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');
  const resolvedTitle = titleProp ?? t('somethingWentWrong');

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{resolvedTitle}</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {reset ? <Button onClick={reset}>{tCommon('tryAgain')}</Button> : null}
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
