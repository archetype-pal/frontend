'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
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
    shelfmark?: string;
    locus?: string;
    repository_name?: string;
    repository_city?: string;
    date?: string;
  };
  className?: string;
  size?: number;
}

export function CollectionStar({
  itemId,
  itemType,
  item,
  className,
  size = 24,
}: CollectionStarProps) {
  const { isInCollection, addItem, removeItem } = useCollection();
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
        'absolute top-2 right-2 z-20 rounded-full p-1 transition-all duration-300 ease-out',
        'bg-black/40 backdrop-blur-sm hover:bg-black/60',
        'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2',
        'hover:scale-110 active:scale-95',
        'pointer-events-auto',
        // Show star if parent is hovered (group-hover) or if item is already in collection
        isCollected
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100',
        className
      )}
      aria-label={isCollected ? 'Remove from collection' : 'Add to collection'}
      title={isCollected ? 'Remove from collection' : 'Add to collection'}
    >
      <Star
        size={size}
        className={cn(
          'transition-all duration-200',
          isCollected
            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
            : 'fill-none text-white/90 group-hover:text-white'
        )}
        strokeWidth={2}
      />
    </button>
  );
}
