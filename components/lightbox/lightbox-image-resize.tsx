'use client';

import * as React from 'react';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { LightboxImage } from '@/lib/lightbox-db';

interface LightboxImageResizeProps {
  image: LightboxImage;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function LightboxImageResize({ image, containerRef }: LightboxImageResizeProps) {
  const { updateImage } = useLightboxStore();

  const handleMouseDown = (e: React.MouseEvent, handle: 'se' | 'sw' | 'ne' | 'nw') => {
    e.preventDefault();
    e.stopPropagation();

    useLightboxStore.getState().saveHistory();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = image.size.width;
    const startHeight = image.size.height;
    const startLeft = image.position.x;
    const startTop = image.position.y;
    const aspectRatio = startWidth / startHeight;
    const el = containerRef.current;

    let finalWidth = startWidth;
    let finalHeight = startHeight;
    let finalX = startLeft;
    let finalY = startTop;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      if (handle === 'se') {
        newWidth = Math.max(100, startWidth + deltaX);
        newHeight = Math.max(100, startHeight + deltaY);
      } else if (handle === 'sw') {
        newWidth = Math.max(100, startWidth - deltaX);
        newHeight = Math.max(100, startHeight + deltaY);
        newX = startLeft + (startWidth - newWidth);
      } else if (handle === 'ne') {
        newWidth = Math.max(100, startWidth + deltaX);
        newHeight = Math.max(100, startHeight - deltaY);
        newY = startTop + (startHeight - newHeight);
      } else if (handle === 'nw') {
        newWidth = Math.max(100, startWidth - deltaX);
        newHeight = Math.max(100, startHeight - deltaY);
        newX = startLeft + (startWidth - newWidth);
        newY = startTop + (startHeight - newHeight);
      }

      // Maintain aspect ratio
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newHeight = newWidth / aspectRatio;
        if (handle === 'sw' || handle === 'nw') {
          newY = startTop + (startHeight - newHeight);
        }
      } else {
        newWidth = newHeight * aspectRatio;
        if (handle === 'sw' || handle === 'nw') {
          newX = startLeft + (startWidth - newWidth);
        }
      }

      finalWidth = newWidth;
      finalHeight = newHeight;
      finalX = newX;
      finalY = newY;

      // Direct DOM mutation — no React re-render during resize
      if (el) {
        el.style.width = `${newWidth}px`;
        el.style.height = `${newHeight}px`;
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Commit final values to store once
      updateImage(image.id, {
        size: { width: finalWidth, height: finalHeight },
        position: { ...image.position, x: finalX, y: finalY },
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Resize handles */}
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-se-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      <div
        className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-sw-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
      <div
        className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-ne-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nw-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
    </>
  );
}
