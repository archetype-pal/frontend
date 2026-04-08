'use client';

import * as React from 'react';

import { getIiifBaseUrl, getSelectorValue, iiifThumbFromSelector } from '@/utils/iiif';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import type { Annotation as A9sAnnotation } from './ManuscriptAnnotorious';

import { browserSafeIiifUrl } from '@/lib/annotation-popup-utils';

export interface AllographGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  activeAllographLabel?: string;
  activeHandLabel: string;
  annotations: A9sAnnotation[];
  iiifImage?: string | null;
  onAnnotationHover: (annotationId: string | null) => void;
  onAnnotationClick: (annotationId: string) => void;
}

export function AllographGalleryDialog({
  open,
  onOpenChange,
  transform,
  dragHandleProps,
  activeAllographLabel,
  activeHandLabel,
  annotations,
  iiifImage,
  onAnnotationHover,
  onAnnotationClick,
}: AllographGalleryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="w-[520px] max-w-[calc(100vw-2rem)] max-h-[72vh] overflow-auto"
        style={{ transform }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="cursor-move select-none" {...dragHandleProps}>
          <DialogTitle className="mb-2">
            {activeAllographLabel ? `Allograph: ${activeAllographLabel}` : 'Allograph'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-4">
          <div className="text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              Hand:
              <span className="text-foreground font-medium">{activeHandLabel}</span>
              <span className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                {annotations.length}
              </span>
            </span>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-4 gap-3">
            {annotations.map((annotation) => {
              const selector = getSelectorValue(annotation);
              if (!selector || !iiifImage) return null;

              const base = browserSafeIiifUrl(getIiifBaseUrl(iiifImage));
              const src = iiifThumbFromSelector(base, selector, 200);
              if (!src) return null;

              return (
                <button
                  key={annotation.id}
                  className="group rounded-md border bg-background overflow-hidden text-left hover:shadow-sm"
                  onMouseEnter={() => onAnnotationHover(annotation.id)}
                  onMouseLeave={() => onAnnotationHover(null)}
                  onClick={() => onAnnotationClick(annotation.id)}
                  title={annotation.id}
                  type="button"
                >
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Annotation thumbnail: ${annotation.id}`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      onError={() => console.warn('thumb failed:', src)}
                    />
                  </div>
                  <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                    {annotation.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
