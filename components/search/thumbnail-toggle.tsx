'use client';

import * as React from 'react';
import { Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ThumbnailToggle({
  showThumbnails,
  onChange,
  className,
}: {
  showThumbnails: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  const t = useTranslations('search');
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onChange(!showThumbnails)}
      className={cn(
        'h-8 gap-1.5 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={showThumbnails ? t('hideThumbnails') : t('showThumbnails')}
      title={showThumbnails ? t('hideThumbnailsTitle') : t('showThumbnailsTitle')}
    >
      {showThumbnails ? (
        <>
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('thumbnailsOn')}</span>
        </>
      ) : (
        <>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('textOnly')}</span>
        </>
      )}
    </Button>
  );
}
