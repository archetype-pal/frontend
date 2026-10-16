'use client';

import { useTranslations } from 'next-intl';
import { Download, Images, Pencil, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GallerySelectionBarProps {
  /** Selected graphs on screen — the ones every action works on. */
  shownCount: number;
  /** Selected graphs the filters currently hide; counted, but left out. */
  hiddenCount: number;
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
  shownCount,
  hiddenCount,
  annotatingMode,
  onEdit,
  onAddToCollection,
  onSendToLightbox,
  onExport,
  onClear,
}: GallerySelectionBarProps) {
  const t = useTranslations('manuscript.gallery');
  const selectedCount = shownCount + hiddenCount;
  if (selectedCount === 0) return null;

  const actions = [
    annotatingMode
      ? { icon: Pencil, label: t('editSelected', { count: shownCount }), onClick: onEdit }
      : {
          icon: Star,
          label: t('addSelected', { count: shownCount }),
          onClick: onAddToCollection,
        },
    { icon: Images, label: t('compare'), onClick: onSendToLightbox },
    { icon: Download, label: t('exportCsv'), onClick: onExport },
  ];

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
        {hiddenCount > 0 && (
          <span className="text-xs text-background/75">
            {t('hiddenByFilters', { count: hiddenCount })}
          </span>
        )}
        <span aria-hidden className="mx-1 h-5 w-px bg-background/25" />
        {actions.map(({ icon: Icon, label, onClick }, i) => (
          <Button
            key={label}
            size="sm"
            variant={i === 0 ? 'default' : 'outline'}
            onClick={onClick}
            disabled={shownCount === 0}
            className={cn(
              'h-9 gap-1.5',
              // The first action is the primary one.
              i === 0
                ? 'bg-background text-foreground hover:bg-background/90'
                : 'border-background/30 bg-transparent text-background hover:bg-background/15 hover:text-background'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Button>
        ))}
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
