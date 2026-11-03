'use client';

import type * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getCarouselImageUrl } from '@/utils/api';
import type { OrderedItem, OrderedItemCardProps } from './ordered-items-page';

interface SortableItemCardProps<T extends OrderedItem> extends OrderedItemCardProps<T> {
  dragLabel: string;
  /** The stored image path; `placeholderIcon` stands in when there is none. */
  image: string;
  imageAlt: string;
  imageFit: 'cover' | 'contain';
  placeholderIcon: LucideIcon;
  title: React.ReactNode;
  subtitle?: string;
}

/** One draggable row of an `OrderedItemsPage`: handle, thumbnail, title, delete. */
export function SortableItemCard<T extends OrderedItem>({
  item,
  isSelected,
  onSelect,
  onDelete,
  dragLabel,
  image,
  imageAlt,
  imageFit,
  placeholderIcon: PlaceholderIcon,
  title,
  subtitle,
}: SortableItemCardProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-2 transition-colors cursor-pointer',
        isSelected ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'hover:bg-accent/50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label={dragLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="h-12 w-20 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
        {image ? (
          /* oxlint-disable-next-line @next/next/no-img-element */
          <img
            src={getCarouselImageUrl(image)}
            alt={imageAlt}
            className={cn(
              'h-full w-full',
              imageFit === 'cover' ? 'object-cover' : 'object-contain'
            )}
          />
        ) : (
          <PlaceholderIcon className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
