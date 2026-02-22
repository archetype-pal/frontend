'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getCarouselImageUrl } from '@/utils/api';
import type { CarouselItem } from '@/types/backoffice';

interface SortableCarouselCardProps {
  item: CarouselItem;
  isSelected: boolean;
  onSelect: (item: CarouselItem) => void;
  onDelete: (item: CarouselItem) => void;
}

export function SortableCarouselCard({
  item,
  isSelected,
  onSelect,
  onDelete,
}: SortableCarouselCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const imageUrl = getCarouselImageUrl(item.image);
  const hasImage = !!item.image;

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
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="h-12 w-20 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.url && <p className="text-xs text-muted-foreground truncate">{item.url}</p>}
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
