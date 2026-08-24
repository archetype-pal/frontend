'use client';

import * as React from 'react';
import { Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// No aria-label: it would override the visible text, leaving the accessible
// name with no word in common with what the button reads ("Text only" vs
// "Show thumbnails") — WCAG 2.5.3. The label is the visible text; `title`
// carries the hint and `aria-pressed` carries the state.
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
      aria-pressed={showThumbnails}
      onClick={() => onChange(!showThumbnails)}
      className={cn(
        'h-8 gap-1.5 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground',
        className
      )}
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
