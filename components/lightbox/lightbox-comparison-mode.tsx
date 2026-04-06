'use client';

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Lock, Unlock } from 'lucide-react';
import { useSelectedImages } from '@/stores/lightbox-store';
import { LightboxImageLayer } from './lightbox-image-layer';
import { LightboxComparisonHeader, type ComparisonViewMode } from './lightbox-comparison-header';
import type { LightboxImage } from '@/lib/lightbox-db';

interface ZoomablePanelProps {
  image: LightboxImage;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  label: string;
}

function ZoomablePanel({ image, zoom, pan, onZoomChange, onPanChange, label }: ZoomablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panBase = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(Math.min(10, Math.max(0.2, zoom + delta)));
    },
    [zoom, onZoomChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panBase.current = { ...pan };
    },
    [pan]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      onPanChange({
        x: panBase.current.x + (e.clientX - panStart.current.x),
        y: panBase.current.y + (e.clientY - panStart.current.y),
      });
    };
    const handleMouseUp = () => {
      isPanning.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onPanChange]);

  // Touch: single-finger pan, two-finger pinch zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastDistance = 0;
    let baseZoom = zoom;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isPanning.current = true;
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panBase.current = { ...pan };
      } else if (e.touches.length === 2) {
        isPanning.current = false;
        lastDistance = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        baseZoom = zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning.current) {
        onPanChange({
          x: panBase.current.x + (e.touches[0].clientX - panStart.current.x),
          y: panBase.current.y + (e.touches[0].clientY - panStart.current.y),
        });
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const scale = dist / lastDistance;
        onZoomChange(Math.min(10, Math.max(0.2, baseZoom * scale)));
      }
    };

    const onTouchEnd = () => {
      isPanning.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom, pan, onZoomChange, onPanChange]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="px-3 py-1 text-xs text-gray-300 bg-gray-900 flex items-center justify-between">
        <span className="truncate">{label}</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-gray-800"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {image.imageUrl && (
            <NextImage
              src={image.imageUrl}
              alt={image.metadata.shelfmark || image.metadata.locus || 'Image'}
              fill
              className="object-contain"
              unoptimized
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface LightboxComparisonModeProps {
  onClose: () => void;
}

export function LightboxComparisonMode({ onClose }: LightboxComparisonModeProps) {
  const selectedImages = useSelectedImages();
  const [mode, setMode] = useState<ComparisonViewMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [syncZoom, setSyncZoom] = useState(true);
  const [zoom1, setZoom1] = useState(1);
  const [zoom2, setZoom2] = useState(1);
  const [pan1, setPan1] = useState({ x: 0, y: 0 });
  const [pan2, setPan2] = useState({ x: 0, y: 0 });

  const handleZoom1 = useCallback(
    (z: number) => {
      setZoom1(z);
      if (syncZoom) setZoom2(z);
    },
    [syncZoom]
  );

  const handleZoom2 = useCallback(
    (z: number) => {
      setZoom2(z);
      if (syncZoom) setZoom1(z);
    },
    [syncZoom]
  );

  const handlePan1 = useCallback(
    (p: { x: number; y: number }) => {
      setPan1(p);
      if (syncZoom) setPan2(p);
    },
    [syncZoom]
  );

  const handlePan2 = useCallback(
    (p: { x: number; y: number }) => {
      setPan2(p);
      if (syncZoom) setPan1(p);
    },
    [syncZoom]
  );

  const resetView = useCallback(() => {
    setZoom1(1);
    setZoom2(1);
    setPan1({ x: 0, y: 0 });
    setPan2({ x: 0, y: 0 });
  }, []);

  if (selectedImages.length < 2) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Comparison Mode</h3>
          <p className="text-muted-foreground mb-4">Please select at least 2 images to compare</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const image1 = selectedImages[0]!;
  const image2 = selectedImages[1]!;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <LightboxComparisonHeader
        title="Comparison Mode"
        mode={mode}
        onModeChange={setMode}
        overlayOpacity={overlayOpacity}
        onOverlayOpacityChange={setOverlayOpacity}
        onClose={onClose}
      />

      {/* Zoom controls bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-1.5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white h-7 px-2"
          onClick={() => {
            handleZoom1(Math.min(10, zoom1 + 0.25));
          }}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white h-7 px-2"
          onClick={() => {
            handleZoom1(Math.max(0.2, zoom1 - 0.25));
          }}
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white h-7 px-2"
          onClick={resetView}
          title="Reset view"
        >
          Reset
        </Button>
        <div className="h-4 w-px bg-gray-700" />
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 gap-1.5 ${syncZoom ? 'text-blue-400 hover:text-blue-300' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setSyncZoom((s) => !s)}
          title={syncZoom ? 'Unsync zoom & pan' : 'Sync zoom & pan'}
        >
          {syncZoom ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          <span className="text-xs">{syncZoom ? 'Synced' : 'Independent'}</span>
        </Button>
      </div>

      {/* Comparison View */}
      <div className="flex-1 flex overflow-hidden">
        {mode === 'side-by-side' ? (
          <>
            <ZoomablePanel
              image={image1}
              zoom={zoom1}
              pan={pan1}
              onZoomChange={handleZoom1}
              onPanChange={handlePan1}
              label={image1.metadata.shelfmark || image1.metadata.locus || 'Image 1'}
            />
            <div className="w-px bg-gray-700" />
            <ZoomablePanel
              image={image2}
              zoom={zoom2}
              pan={pan2}
              onZoomChange={handleZoom2}
              onPanChange={handlePan2}
              label={image2.metadata.shelfmark || image2.metadata.locus || 'Image 2'}
            />
          </>
        ) : (
          <div className="flex-1 relative overflow-hidden bg-gray-800">
            <div
              className="relative w-full h-full"
              style={{
                transform: `translate(${pan1.x}px, ${pan1.y}px) scale(${zoom1})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Base image */}
              <div className="absolute inset-0">
                <LightboxImageLayer images={[image1]} />
              </div>
              {/* Overlay image */}
              <div className="absolute inset-0" style={{ opacity: overlayOpacity }}>
                <LightboxImageLayer images={[image2]} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
