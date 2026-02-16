'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCarouselImageUrl } from '@/utils/api'
import type { CarouselItem } from '@/types/backoffice'

interface CarouselPreviewProps {
  items: CarouselItem[]
}

/**
 * Mini live preview of the public-facing carousel.
 * Shows image, title overlay, navigation arrows, and dot indicators.
 */
export function CarouselPreview({ items }: CarouselPreviewProps) {
  const [current, setCurrent] = useState(0)

  const safeIndex = items.length > 0 ? current % items.length : 0
  const currentItem = items[safeIndex]

  const next = useCallback(() => {
    if (items.length === 0) return
    setCurrent((prev) => (prev + 1) % items.length)
  }, [items.length])

  const prev = useCallback(() => {
    if (items.length === 0) return
    setCurrent((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No items to preview</p>
        <p className="text-xs mt-1 opacity-70">
          Add carousel items to see a live preview here.
        </p>
      </div>
    )
  }

  const imageUrl = getCarouselImageUrl(currentItem?.image)
  const hasImage = !!currentItem?.image

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Live Preview</h2>
      <div className="relative overflow-hidden rounded-lg border bg-muted">
        <div className="relative aspect-[16/9] max-h-[360px]">
          {hasImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={currentItem.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}

          {/* Dark overlay matching public carousel */}
          {hasImage && (
            <div className="absolute inset-0 bg-black/40" aria-hidden />
          )}

          {/* Navigation arrows */}
          {items.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 left-2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={next}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Dot indicators */}
          {items.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    i === safeIndex ? 'bg-white' : 'bg-white/40'
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Title overlay */}
          {currentItem?.title && (
            <div className="absolute bottom-0 inset-x-0 bg-black/70 px-4 py-2.5 text-center">
              <p className="text-sm font-medium text-white truncate">
                {currentItem.title}
              </p>
              {currentItem.url && (
                <p className="text-xs text-white/60 truncate mt-0.5">
                  {currentItem.url}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing slide {safeIndex + 1} of {items.length} &mdash; as it will
        appear on the homepage
      </p>
    </div>
  )
}
