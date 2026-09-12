'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCollection } from '@/contexts/collection-context';
import { cn } from '@/lib/utils';

export interface CollectionStarProps {
  itemId: number;
  itemType: 'image' | 'graph';
  item: {
    id: number;
    item_part?: number | null;
    item_image?: number | null;
    image_iiif?: string;
    coordinates?: string;
    annotation_type?: string | null;
    allograph?: string;
    character?: string;
    character_type?: string;
    hand_name?: string;
    shelfmark?: string;
    locus?: string;
    repository_name?: string;
    repository_city?: string;
    date?: string;
  };
  className?: string;
  size?: number;
  appearance?: 'overlay' | 'surface';
}

export function CollectionStar({
  itemId,
  itemType,
  item,
  className,
  size = 24,
  appearance = 'overlay',
}: CollectionStarProps) {
  const t = useTranslations('collection');
  const { isInCollection, addItem, removeItem } = useCollection();
  const isSurface = appearance === 'surface';
  // Re-compute isCollected whenever items change
  const isCollected = React.useMemo(
    () => isInCollection(itemId, itemType),
    [isInCollection, itemId, itemType]
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCollected) {
      removeItem(itemId, itemType);
    } else {
      addItem({
        ...item,
        id: itemId,
        type: itemType,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'z-20 p-1 transition-all duration-300 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'pointer-events-auto',
        isSurface
          ? 'static h-7 w-7 rounded-md border border-amber-400/80 bg-amber-100/95 text-amber-800 opacity-100 scale-100 shadow-sm backdrop-blur-sm hover:bg-amber-200 hover:text-amber-900 hover:scale-100 focus:ring-amber-500 dark:border-amber-400/50 dark:bg-amber-950/90 dark:text-amber-100 dark:hover:bg-amber-900/90'
          : cn(
              'absolute top-2 right-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60',
              'focus:ring-yellow-400 hover:scale-110 active:scale-95',
              // Show star if parent is hovered (group-hover) or if item is already in collection
              isCollected
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            ),
        className
      )}
      aria-label={isCollected ? t('star.remove') : t('star.add')}
      aria-pressed={isCollected}
      title={isCollected ? t('star.remove') : t('star.add')}
    >
      <Star
        size={size}
        className={cn(
          'transition-all duration-200',
          isCollected
            ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
            : isSurface
              ? 'fill-amber-200/80 text-amber-700 drop-shadow-sm dark:fill-amber-400/25 dark:text-amber-200'
              : 'fill-none text-white/90 group-hover:text-white'
        )}
        strokeWidth={isSurface && !isCollected ? 2.5 : 2}
      />
    </button>
  );
}
