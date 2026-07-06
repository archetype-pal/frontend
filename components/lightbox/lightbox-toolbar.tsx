'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Download,
  Save,
  Crop,
  Map,
  Ruler,
  Split,
  Layers,
  Grid3x3,
  MessageSquare,
  Upload,
  Undo2,
  Redo2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  StickyNote,
  CircleHelp,
} from 'lucide-react';
import { useLightboxStore, useSelectedImages } from '@/stores/lightbox-store';
import { LightboxTransformPanel } from './lightbox-transform-panel';
import { LightboxHelpDialog } from './lightbox-help-dialog';

interface LightboxToolbarProps {
  onCrop?: (imageId: string) => void;
  onExport?: () => void;
  onSaveSession?: () => void;
  onImport?: () => void;
  onToggleMinimap?: () => void;
  onToggleMeasurement?: () => void;
  onToggleComparison?: () => void;
  onToggleRegionComparison?: () => void;
  onAddStickyNote?: () => void;
}

export function LightboxToolbar({
  onCrop,
  onExport,
  onSaveSession,
  onImport,
  onToggleMinimap,
  onToggleMeasurement,
  onToggleComparison,
  onToggleRegionComparison,
  onAddStickyNote,
}: LightboxToolbarProps = {}) {
  const t = useTranslations('lightbox');
  const {
    updateImage,
    saveHistory,
    zoom,
    setZoom,
    showAnnotations,
    setShowAnnotations,
    showGrid,
    setShowGrid,
    bringToFront,
    sendToBack,
    moveUp,
    moveDown,
    undo,
    redo,
    historyIndex,
    history,
  } = useLightboxStore();
  const selectedImages = useSelectedImages();

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 10));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.1));
  };

  const handleRotate = () => {
    saveHistory();
    selectedImages.forEach((img) =>
      updateImage(img.id, {
        transform: {
          ...img.transform,
          rotation: (img.transform.rotation + 90) % 360,
        },
      })
    );
  };

  const handleFlipX = () => {
    saveHistory();
    selectedImages.forEach((img) =>
      updateImage(img.id, {
        transform: { ...img.transform, flipX: !img.transform.flipX },
      })
    );
  };

  const handleFlipY = () => {
    saveHistory();
    selectedImages.forEach((img) =>
      updateImage(img.id, {
        transform: { ...img.transform, flipY: !img.transform.flipY },
      })
    );
  };

  const [helpOpen, setHelpOpen] = React.useState(false);
  const hasSelection = selectedImages.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= 0.1}
          aria-label={t('toolbar.zoomOut')}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= 10}
          aria-label={t('toolbar.zoomIn')}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Transform Controls */}
      {hasSelection && (
        <>
          <LightboxTransformPanel />
          <Button variant="ghost" size="sm" onClick={handleRotate} title={t('toolbar.rotate')}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFlipX} title={t('toolbar.flipHorizontal')}>
            <FlipHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFlipY} title={t('toolbar.flipVertical')}>
            <FlipVertical className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-0.5 border-l pl-2 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedImages.forEach((img) => bringToFront(img.id))}
              title={t('toolbar.bringToFront')}
            >
              <ArrowUpToLine className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedImages.forEach((img) => moveUp(img.id))}
              title={t('toolbar.moveUp')}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedImages.forEach((img) => moveDown(img.id))}
              title={t('toolbar.moveDown')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedImages.forEach((img) => sendToBack(img.id))}
              title={t('toolbar.sendToBack')}
            >
              <ArrowDownToLine className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Actions */}
      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const firstSelected = selectedImages[0];
            if (firstSelected && onCrop) {
              onCrop(firstSelected.id);
            }
          }}
          title={t('toolbar.crop')}
        >
          <Crop className="h-4 w-4" />
        </Button>
      )}

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r pr-2">
        <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} title={t('toolbar.undo')}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title={t('toolbar.redo')}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-l pl-2">
        {onImport && (
          <Button variant="ghost" size="sm" onClick={onImport} title={t('toolbar.import')}>
            <Upload className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant={showGrid ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
          title={t('toolbar.toggleGrid')}
          aria-label={t('toolbar.toggleGridLabel')}
          aria-pressed={showGrid}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        {onAddStickyNote && (
          <Button variant="ghost" size="sm" onClick={onAddStickyNote} title={t('toolbar.addStickyNote')}>
            <StickyNote className="h-4 w-4" />
          </Button>
        )}
        {hasSelection && selectedImages.length === 1 && (
          <Button
            variant={showAnnotations ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowAnnotations(!showAnnotations)}
            title={t('toolbar.toggleAnnotations')}
            aria-label={t('toolbar.toggleAnnotationsLabel')}
            aria-pressed={showAnnotations}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
        {onToggleMinimap && (
          <Button variant="ghost" size="sm" onClick={onToggleMinimap} title={t('toolbar.toggleMinimap')}>
            <Map className="h-4 w-4" />
          </Button>
        )}
        {onToggleMeasurement && (
          <Button variant="ghost" size="sm" onClick={onToggleMeasurement} title={t('toolbar.measurement')}>
            <Ruler className="h-4 w-4" />
          </Button>
        )}
        {onToggleComparison && hasSelection && selectedImages.length >= 2 && (
          <Button variant="ghost" size="sm" onClick={onToggleComparison} title={t('toolbar.compareImages')}>
            <Split className="h-4 w-4" />
          </Button>
        )}
        {onToggleRegionComparison && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRegionComparison}
            title={t('toolbar.compareRegions')}
          >
            <Layers className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onSaveSession} title={t('toolbar.saveSession')}>
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport} title={t('toolbar.export')}>
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title={t('toolbar.fullscreen')}
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" title={t('toolbar.help')} onClick={() => setHelpOpen(true)}>
          <CircleHelp className="h-4 w-4" />
        </Button>
      </div>
      <LightboxHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
