'use client';

import { useTranslations } from 'next-intl';
import { Download, Images, Pencil, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface GallerySelectionBarProps {
  selectedCount: number;
  annotatingMode: boolean;
  onEdit: () => void;
  onAddToCollection: () => void;
  onSendToLightbox: () => void;
  onExport: () => void;
  onClear: () => void;
}

// Floats at the bottom of the gallery while anything is selected, so the
// actions stay in reach without the toolbar changing size.
export function GallerySelectionBar({
  selectedCount,
  annotatingMode,
  onEdit,
  onAddToCollection,
  onSendToLightbox,
  onExport,
  onClear,
}: GallerySelectionBarProps) {
  const t = useTranslations('manuscript.gallery');
  if (selectedCount === 0) return null;

  const barButton =
    'h-9 gap-1.5 border-background/30 bg-transparent text-background hover:bg-background/15 hover:text-background';

  return (
    <div className="pointer-events-none sticky bottom-4 z-40 flex justify-center pt-6">
      <div
        role="region"
        aria-label={t('selectionLabel')}
        className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl bg-foreground py-2 pl-4 pr-2 text-background shadow-xl"
      >
        <span className="text-sm font-semibold tabular-nums">
          {t('selectedCount', { count: selectedCount })}
        </span>
        <span aria-hidden className="mx-1 h-5 w-px bg-background/25" />
        {annotatingMode ? (
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-background text-foreground hover:bg-background/90"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            {t('editSelected', { count: selectedCount })}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-background text-foreground hover:bg-background/90"
            onClick={onAddToCollection}
          >
            <Star className="h-4 w-4" aria-hidden />
            {t('addSelected', { count: selectedCount })}
          </Button>
        )}
        <Button size="sm" variant="outline" className={barButton} onClick={onSendToLightbox}>
          <Images className="h-4 w-4" aria-hidden />
          {t('compare')}
        </Button>
        <Button size="sm" variant="outline" className={barButton} onClick={onExport}>
          <Download className="h-4 w-4" aria-hidden />
          {t('exportCsv')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 text-background hover:bg-background/15 hover:text-background"
          onClick={onClear}
        >
          {t('clearSelection')}
        </Button>
      </div>
    </div>
  );
}
