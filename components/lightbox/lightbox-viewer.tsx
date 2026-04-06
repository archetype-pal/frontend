'use client';

import * as React from 'react';
import { useLightboxStore, useWorkspaceImages } from '@/stores/lightbox-store';
import { LightboxImageLayer } from './lightbox-image-layer';
import { LightboxMinimap } from './lightbox-minimap';
import { LightboxGridOverlay } from './lightbox-grid-overlay';
import { LightboxAnnotations } from './lightbox-annotations';
import { LightboxStickyNotes } from './lightbox-sticky-notes';

interface LightboxViewerProps {
  showMinimap?: boolean;
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function LightboxViewer({ showMinimap = false }: LightboxViewerProps = {}) {
  const { currentWorkspaceId, showAnnotations, showGrid, selectedImageIds, zoom, setZoom } =
    useLightboxStore();
  const workspaceImages = useWorkspaceImages();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Wheel-to-zoom and pinch-to-zoom
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Mouse wheel zoom
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // Only zoom with Ctrl/Cmd+scroll
      e.preventDefault();
      const currentZoom = useLightboxStore.getState().zoom;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(Math.min(5, Math.max(0.1, currentZoom + delta)));
    };

    // Pinch-to-zoom on touch devices
    let lastDistance = 0;
    let baseZoom = 1;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDistance = getDistance(e.touches[0], e.touches[1]);
        baseZoom = useLightboxStore.getState().zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / lastDistance;
        const newZoom = Math.min(5, Math.max(0.1, baseZoom * scale));
        setZoom(newZoom);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [setZoom]);

  if (!currentWorkspaceId) {
    return (
      <EmptyState
        title="No workspace selected"
        subtitle="Create a new workspace or select an existing one from the sidebar"
      />
    );
  }

  if (workspaceImages.length === 0) {
    return (
      <EmptyState
        title="No images in workspace"
        subtitle="Add images from your collection or search results"
      />
    );
  }

  const selectedImage =
    selectedImageIds.size === 1
      ? workspaceImages.find((img) => selectedImageIds.has(img.id))
      : null;

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gray-100 overflow-hidden">
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `scale(${zoom})`,
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
        }}
      >
        {showGrid && <LightboxGridOverlay />}
        <div className="absolute inset-0">
          <LightboxImageLayer images={workspaceImages} />
        </div>
        {showAnnotations && selectedImage && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${selectedImage.position.x}px`,
              top: `${selectedImage.position.y}px`,
              width: `${selectedImage.size.width}px`,
              height: `${selectedImage.size.height}px`,
              zIndex: selectedImage.position.zIndex + 1,
            }}
          >
            <LightboxAnnotations image={selectedImage} />
          </div>
        )}
        {currentWorkspaceId && <LightboxStickyNotes workspaceId={currentWorkspaceId} />}
      </div>
      {showMinimap && <LightboxMinimap containerRef={containerRef} />}
    </div>
  );
}
