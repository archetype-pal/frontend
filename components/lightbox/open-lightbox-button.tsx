'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, ExternalLink } from 'lucide-react';
import {
  openLightboxWithImage,
  openLightboxWithGraph,
  openLightboxWithItems,
} from '@/lib/lightbox-utils';
import type { ImageListItem } from '@/types/image';
import type { GraphListItem } from '@/types/graph';
import type { CollectionItem } from '@/contexts/collection-context';

interface OpenLightboxButtonProps {
  item?: ImageListItem | GraphListItem | CollectionItem;
  items?: (ImageListItem | GraphListItem | CollectionItem)[];
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function OpenLightboxButton({
  item,
  items,
  variant = 'ghost',
  size = 'sm',
  className,
}: OpenLightboxButtonProps) {
  const handleClick = () => {
    if (items && items.length > 0) {
      openLightboxWithItems(items);
    } else if (item) {
      const type = 'type' in item ? item.type : 'image' in item ? 'image' : 'graph';
      if (type === 'image') {
        openLightboxWithImage(item.id);
      } else {
        openLightboxWithGraph(item.id);
      }
    }
  };

  if (!item && (!items || items.length === 0)) {
    return null;
  }

  const icon =
    size === 'icon' ? <Maximize2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4 mr-2" />;
  const label = size !== 'icon' ? 'Open in Lightbox' : undefined;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
      title="Open in Lightbox"
    >
      {icon}
      {label}
    </Button>
  );
}
