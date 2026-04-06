'use client';

import * as React from 'react';
import NextImage from 'next/image';
import { AlertTriangle, RotateCw } from 'lucide-react';
import type { LightboxImage } from '@/lib/lightbox-db';
import { useLightboxStore } from '@/stores/lightbox-store';
import { cn } from '@/lib/utils';
import { LightboxImageResize } from './lightbox-image-resize';

interface LightboxImageLayerProps {
  images: LightboxImage[];
}

function clampPosition(
  x: number,
  y: number,
  containerRect: DOMRect,
  imageSize: { width: number; height: number }
) {
  const MIN_VISIBLE = 50;
  return {
    x: Math.max(MIN_VISIBLE - imageSize.width, Math.min(x, containerRect.width - MIN_VISIBLE)),
    y: Math.max(MIN_VISIBLE - imageSize.height, Math.min(y, containerRect.height - MIN_VISIBLE)),
  };
}

const ImageWithErrorHandler = React.memo(function ImageWithErrorHandler({
  image,
}: {
  image: LightboxImage;
}) {
  const [loadError, setLoadError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [retryKey, setRetryKey] = React.useState(0);

  if (!image.imageUrl) {
    return (
      <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center text-sm text-gray-500 gap-1">
        <AlertTriangle className="h-5 w-5 text-gray-400" />
        <span>No image URL</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span>Failed to load</span>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setLoadError(false);
            setIsLoading(true);
            setRetryKey((k) => k + 1);
          }}
        >
          <RotateCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-0">
          <div className="animate-pulse bg-gray-200 rounded w-3/4 h-3/4" />
        </div>
      )}
      <NextImage
        key={retryKey}
        src={image.imageUrl}
        alt={image.metadata.shelfmark || image.metadata.locus || 'Image'}
        fill
        className="object-contain"
        unoptimized
        draggable={false}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setLoadError(true);
        }}
      />
    </>
  );
});

interface LightboxImageItemProps {
  image: LightboxImage;
  isSelected: boolean;
  onDragStart: (imageId: string, clientX: number, clientY: number, el: HTMLDivElement) => void;
  onTouchDragStart: (imageId: string, clientX: number, clientY: number, el: HTMLDivElement) => void;
  onClick: (e: React.MouseEvent, imageId: string) => void;
}

const LightboxImageItem = React.memo(function LightboxImageItem({
  image,
  isSelected,
  onDragStart,
  onTouchDragStart,
  onClick,
}: LightboxImageItemProps) {
  const elRef = React.useRef<HTMLDivElement>(null);

  const transformStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${image.position.x}px`,
    top: `${image.position.y}px`,
    width: `${image.size.width}px`,
    height: `${image.size.height}px`,
    zIndex: image.position.zIndex,
    opacity: image.transform.opacity,
    transform: `
      rotate(${image.transform.rotation}deg)
      scaleX(${image.transform.flipX ? -1 : 1})
      scaleY(${image.transform.flipY ? -1 : 1})
    `,
    filter: `
      brightness(${image.transform.brightness}%)
      contrast(${image.transform.contrast}%)
      ${image.transform.grayscale ? 'grayscale(100%)' : ''}
    `,
    cursor: 'grab',
    userSelect: 'none',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (elRef.current) {
      onDragStart(image.id, e.clientX, e.clientY, elRef.current);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    if (elRef.current) {
      const touch = e.touches[0];
      onTouchDragStart(image.id, touch.clientX, touch.clientY, elRef.current);
    }
  };

  return (
    <div
      ref={elRef}
      style={transformStyle}
      className={cn(
        'border-2 group',
        isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-300'
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => onClick(e, image.id)}
    >
      <div className="relative w-full h-full">
        <ImageWithErrorHandler image={image} />
        {(image.metadata.shelfmark || image.metadata.locus) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate pointer-events-none">
            {image.metadata.locus || image.metadata.shelfmark}
          </div>
        )}
      </div>
      {isSelected && <LightboxImageResize image={image} containerRef={elRef} />}
    </div>
  );
});

export function LightboxImageLayer({ images }: LightboxImageLayerProps) {
  const { selectedImageIds, updateImage } = useLightboxStore();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Ref-based drag state — no React state updates during drag, only DOM mutations
  const dragRef = React.useRef<{
    imageId: string | null;
    el: HTMLDivElement | null;
    offset: { x: number; y: number };
    lastPosition: { x: number; y: number } | null;
  }>({ imageId: null, el: null, offset: { x: 0, y: 0 }, lastPosition: null });

  const startDrag = React.useCallback(
    (imageId: string, clientX: number, clientY: number, el: HTMLDivElement) => {
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        imageId,
        el,
        offset: { x: clientX - rect.left, y: clientY - rect.top },
        lastPosition: null,
      };
      el.style.cursor = 'grabbing';
    },
    []
  );

  const moveDrag = React.useCallback(
    (clientX: number, clientY: number) => {
      const { imageId, el, offset } = dragRef.current;
      if (!imageId || !el || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      const rawX = clientX - containerRect.left - offset.x;
      const rawY = clientY - containerRect.top - offset.y;
      const pos = clampPosition(rawX, rawY, containerRect, image.size);
      dragRef.current.lastPosition = pos;
      // Direct DOM mutation — no React re-render
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
    },
    [images]
  );

  const endDrag = React.useCallback(() => {
    const { imageId, el, lastPosition } = dragRef.current;
    dragRef.current = { imageId: null, el: null, offset: { x: 0, y: 0 }, lastPosition: null };
    if (el) el.style.cursor = 'grab';

    if (imageId && lastPosition) {
      const image = images.find((img) => img.id === imageId);
      if (image) {
        useLightboxStore.getState().saveHistory();
        updateImage(imageId, {
          position: { ...image.position, ...lastPosition },
        });
      }
    }
  }, [images, updateImage]);

  // Mouse drag handlers
  const handleDragStart = React.useCallback(
    (imageId: string, clientX: number, clientY: number, el: HTMLDivElement) => {
      startDrag(imageId, clientX, clientY, el);

      const handleMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
      const handleMouseUp = () => {
        endDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [startDrag, moveDrag, endDrag]
  );

  // Touch drag handlers
  const handleTouchDragStart = React.useCallback(
    (imageId: string, clientX: number, clientY: number, el: HTMLDivElement) => {
      startDrag(imageId, clientX, clientY, el);

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      };
      const handleTouchEnd = () => {
        endDrag();
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    },
    [startDrag, moveDrag, endDrag]
  );

  const handleImageClick = React.useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    const { selectImage, deselectImage, selectedImageIds } = useLightboxStore.getState();
    if (selectedImageIds.has(imageId)) {
      deselectImage(imageId);
    } else {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) useLightboxStore.getState().deselectAll();
      selectImage(imageId);
    }
  }, []);

  return (
    <div ref={containerRef} className="lightbox-container relative w-full h-full overflow-hidden">
      {images.map((image) => (
        <LightboxImageItem
          key={image.id}
          image={image}
          isSelected={selectedImageIds.has(image.id)}
          onDragStart={handleDragStart}
          onTouchDragStart={handleTouchDragStart}
          onClick={handleImageClick}
        />
      ))}
    </div>
  );
}
