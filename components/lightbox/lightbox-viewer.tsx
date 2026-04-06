'use client';

import * as React from 'react';
import { useLightboxStore, useWorkspaceImages } from '@/stores/lightbox-store';
import { LightboxImageLayer } from './lightbox-image-layer';
import { LightboxMinimap } from './lightbox-minimap';
import { LightboxGridOverlay } from './lightbox-grid-overlay';
import { LightboxAnnotations } from './lightbox-annotations';

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
  const { currentWorkspaceId, showAnnotations, showGrid, selectedImageIds, zoom } =
    useLightboxStore();
  const workspaceImages = useWorkspaceImages();
  const containerRef = React.useRef<HTMLDivElement>(null);

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
      </div>
      {showMinimap && <LightboxMinimap containerRef={containerRef} />}
    </div>
  );
}
