'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('lightbox');
  // Field-level selectors so unrelated store mutations don't re-render the whole
  // canvas. (zoom/setZoom are read here but the live transform is applied
  // directly to the DOM, so a re-render on zoom is harmless.)
  const currentWorkspaceId = useLightboxStore((s) => s.currentWorkspaceId);
  const showAnnotations = useLightboxStore((s) => s.showAnnotations);
  const showGrid = useLightboxStore((s) => s.showGrid);
  const selectedImageIds = useLightboxStore((s) => s.selectedImageIds);
  const zoom = useLightboxStore((s) => s.zoom);
  const setZoom = useLightboxStore((s) => s.setZoom);
  const workspaceImages = useWorkspaceImages();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef({ x: 0, y: 0 });

  // Apply the transform directly to the DOM element (avoids re-render)
  const applyTransform = React.useCallback((z: number, pan: { x: number; y: number }) => {
    const el = canvasRef.current;
    if (!el) return;
    el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${z})`;
  }, []);

  // Cursor-centered wheel zoom and pinch-to-zoom
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const currentZoom = useLightboxStore.getState().zoom;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(5, Math.max(0.1, currentZoom + delta));

      // Adjust pan so the point under the cursor stays fixed
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const scale = newZoom / currentZoom;
      const pan = panRef.current;
      panRef.current = {
        x: cursorX - scale * (cursorX - pan.x),
        y: cursorY - scale * (cursorY - pan.y),
      };

      setZoom(newZoom);
      applyTransform(newZoom, panRef.current);
    };

    // Pinch-to-zoom on touch devices
    let lastDistance = 0;
    let baseZoom = 1;
    let basePan = { x: 0, y: 0 };

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getMidpoint = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDistance = getDistance(e.touches[0], e.touches[1]);
        baseZoom = useLightboxStore.getState().zoom;
        basePan = { ...panRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / lastDistance;
        const newZoom = Math.min(5, Math.max(0.1, baseZoom * scale));

        const rect = el.getBoundingClientRect();
        const mid = getMidpoint(e.touches[0], e.touches[1]);
        const cx = mid.x - rect.left;
        const cy = mid.y - rect.top;
        const s = newZoom / baseZoom;
        panRef.current = {
          x: cx - s * (cx - basePan.x),
          y: cy - s * (cy - basePan.y),
        };

        setZoom(newZoom);
        applyTransform(newZoom, panRef.current);
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
  }, [setZoom, applyTransform]);

  // Sync the DOM when zoom changes from toolbar buttons (not from wheel/pinch)
  React.useEffect(() => {
    applyTransform(zoom, panRef.current);
  }, [zoom, applyTransform]);

  if (!currentWorkspaceId) {
    return (
      <EmptyState
        title={t('viewer.noWorkspaceSelected')}
        subtitle={t('viewer.noWorkspaceSelectedSubtitle')}
      />
    );
  }

  if (workspaceImages.length === 0) {
    return (
      <EmptyState
        title={t('viewer.noImagesInWorkspace')}
        subtitle={t('viewer.noImagesInWorkspaceSubtitle')}
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
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          transformOrigin: '0 0',
          transform: `scale(${zoom})`,
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
