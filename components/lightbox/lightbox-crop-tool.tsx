'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Crop, Save } from 'lucide-react';
import type { LightboxImage } from '@/lib/lightbox-db';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LightboxCropToolProps {
  image: LightboxImage;
  onCrop: (cropArea: CropArea) => Promise<void>;
  onCancel: () => void;
}

export function LightboxCropTool({ image, onCrop, onCancel }: LightboxCropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState<CropArea | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Initialize crop area to center 50% of image
    const initialWidth = rect.width * 0.5;
    const initialHeight = rect.height * 0.5;
    setCropArea({
      x: (rect.width - initialWidth) / 2,
      y: (rect.height - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !cropArea) return;

    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking inside crop area
    const isInside =
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height;

    if (isInside) {
      setIsDragging(true);
      setDragStart({
        x: x - cropArea.x,
        y: y - cropArea.y,
      });
    } else {
      // Start new crop area
      setCropArea({
        x,
        y,
        width: 0,
        height: 0,
      });
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !cropArea) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragStart.x < cropArea.x || dragStart.y < cropArea.y) {
        // Dragging from inside - move crop area
        const newX = Math.max(0, Math.min(x - dragStart.x, rect.width - cropArea.width));
        const newY = Math.max(0, Math.min(y - dragStart.y, rect.height - cropArea.height));
        setCropArea({
          ...cropArea,
          x: newX,
          y: newY,
        });
      } else {
        // Dragging from outside - resize crop area
        const newWidth = Math.max(20, Math.min(x - dragStart.x, rect.width - dragStart.x));
        const newHeight = Math.max(20, Math.min(y - dragStart.y, rect.height - dragStart.y));
        setCropArea({
          x: dragStart.x,
          y: dragStart.y,
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, cropArea, dragStart]);

  const handleSave = async () => {
    if (!cropArea) return;
    await onCrop(cropArea);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop Image
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 p-4">
          <div
            ref={containerRef}
            className="relative border-2 border-dashed border-gray-300 bg-gray-100"
            style={{
              width: '100%',
              height: '400px',
              backgroundImage: image.imageUrl ? `url(${image.imageUrl})` : undefined,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
            onMouseDown={handleMouseDown}
          >
            {cropArea && (
              <>
                {/* Crop overlay */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20"
                  style={{
                    left: `${cropArea.x}px`,
                    top: `${cropArea.y}px`,
                    width: `${cropArea.width}px`,
                    height: `${cropArea.height}px`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                />
                {/* Dark overlay outside crop area */}
                <svg className="absolute inset-0 pointer-events-none">
                  <defs>
                    <mask id="crop-mask">
                      <rect width="100%" height="100%" fill="black" />
                      <rect
                        x={cropArea.x}
                        y={cropArea.y}
                        width={cropArea.width}
                        height={cropArea.height}
                        fill="white"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="black"
                    fillOpacity="0.5"
                    mask="url(#crop-mask)"
                  />
                </svg>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!cropArea}>
            <Save className="h-4 w-4 mr-2" />
            Save Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
