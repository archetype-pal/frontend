'use client';

import {
  Expand,
  Hand,
  Keyboard,
  LaptopMinimal,
  Pencil,
  RefreshCcw,
  Save,
  SquarePen,
  Trash2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toolbar } from './toolbar';
import type { ActiveViewerTool } from '@/hooks/use-viewer-editor-ui-state';
import type { AnnotationCreationKind, ToolbarPosition } from '@/types/annotation-viewer';

interface ViewerToolbarProps {
  toolbarPosition: ToolbarPosition;
  isFullScreen: boolean;
  activeTool: ActiveViewerTool;
  currentCreationKind: AnnotationCreationKind;
  canCreateEditorialAnnotations: boolean;
  canPersistAnyAnnotations: boolean;
  unsavedChanges: number;
  canDeleteAnnotations: boolean;
  canCreatePublicAnnotations: boolean;
  /**
   * Pure Text view: a drawn region links to a phrase, so the glyph-only tools
   * (editorial create, draft Save) are hidden — Draw/Modify/Delete remain for
   * region work.
   */
  textOnlyMode: boolean;
  onToggleFullScreen: () => void;
  onMoveTool: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  onCreateAnnotation: (kind: AnnotationCreationKind) => void;
  onSave: () => void;
  onDeleteTool: () => void;
  onModifyTool: () => void;
  /** Opens the keyboard-shortcuts reference. */
  onShowShortcuts: () => void;
}

/**
 * One tool-rail button: a tooltip-wrapped icon Button. `tooltip` falls back to
 * `label` but is kept separate because several buttons intentionally differ
 * (e.g. aria-label "Zoom in" vs tooltip "Zoom In").
 */
function ToolbarButton({
  icon: Icon,
  label,
  tooltip,
  keyshortcuts,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  keyshortcuts: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          aria-label={label}
          aria-keyshortcuts={keyshortcuts}
          disabled={disabled}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}

/** The floating viewer tool rail (full-screen, pan, zoom, draw, save, …). */
export function ViewerToolbar({
  toolbarPosition,
  isFullScreen,
  activeTool,
  currentCreationKind,
  canCreateEditorialAnnotations,
  canPersistAnyAnnotations,
  unsavedChanges,
  canDeleteAnnotations,
  canCreatePublicAnnotations,
  textOnlyMode,
  onToggleFullScreen,
  onMoveTool,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onCreateAnnotation,
  onSave,
  onDeleteTool,
  onModifyTool,
  onShowShortcuts,
}: ViewerToolbarProps) {
  const t = useTranslations('manuscript');

  return (
    <Toolbar orientation={toolbarPosition}>
      <TooltipProvider>
        <ToolbarButton
          icon={LaptopMinimal}
          label={isFullScreen ? t('toolbar.exitFullScreen') : t('toolbar.fullScreen')}
          tooltip={isFullScreen ? t('toolbar.exitFullScreenTooltip') : t('toolbar.fullScreenTooltip')}
          keyshortcuts="F Shift+F"
          active={isFullScreen}
          onClick={onToggleFullScreen}
        />

        <ToolbarButton
          icon={Hand}
          label={t('toolbar.selectDrag')}
          keyshortcuts="G Shift+G Space"
          active={activeTool === 'move'}
          onClick={onMoveTool}
        />

        <ToolbarButton
          icon={ZoomIn}
          label={t('toolbar.zoomIn')}
          tooltip={t('toolbar.zoomInTooltip')}
          keyshortcuts="Z Shift+Z ="
          onClick={onZoomIn}
        />

        <ToolbarButton
          icon={ZoomOut}
          label={t('toolbar.zoomOut')}
          tooltip={t('toolbar.zoomOutTooltip')}
          keyshortcuts="-"
          onClick={onZoomOut}
        />

        <ToolbarButton icon={RefreshCcw} label={t('toolbar.refresh')} keyshortcuts="Home" onClick={onRefresh} />

        {!textOnlyMode && canCreateEditorialAnnotations && (
          <ToolbarButton
            icon={Pencil}
            label={t('toolbar.editorialAnnotation')}
            tooltip={t('toolbar.editorialAnnotationTooltip')}
            keyshortcuts="E Shift+E"
            active={activeTool === 'draw' && currentCreationKind === 'editorial'}
            onClick={() => onCreateAnnotation('editorial')}
          />
        )}

        {!textOnlyMode && canPersistAnyAnnotations && (
          <ToolbarButton
            icon={Save}
            label={t('toolbar.save')}
            keyshortcuts="S Shift+S Control+S Meta+S"
            disabled={unsavedChanges === 0}
            onClick={onSave}
          />
        )}

        {canDeleteAnnotations && (
          <ToolbarButton
            icon={Trash2}
            label={textOnlyMode ? t('toolbar.deleteRegion') : t('toolbar.delete')}
            tooltip={textOnlyMode ? t('toolbar.deleteRegionTooltip') : undefined}
            keyshortcuts="X Delete Shift+Backspace"
            active={activeTool === 'delete'}
            onClick={onDeleteTool}
          />
        )}

        <ToolbarButton
          icon={Expand}
          label={textOnlyMode ? t('toolbar.modifyRegion') : t('toolbar.modify')}
          tooltip={textOnlyMode ? t('toolbar.modifyRegionTooltip') : undefined}
          keyshortcuts="M Shift+M"
          active={activeTool === 'modify'}
          onClick={onModifyTool}
        />

        {canCreatePublicAnnotations && (
          <ToolbarButton
            icon={SquarePen}
            label={textOnlyMode ? t('toolbar.drawRegion') : t('toolbar.draw')}
            tooltip={textOnlyMode ? t('toolbar.drawRegionTooltip') : undefined}
            keyshortcuts="D Shift+D R Shift+R Space"
            active={activeTool === 'draw' && currentCreationKind === 'public'}
            onClick={() => onCreateAnnotation('public')}
          />
        )}

        <ToolbarButton
          icon={Keyboard}
          label={t('toolbar.keyboardShortcuts')}
          tooltip={t('toolbar.keyboardShortcutsTooltip')}
          keyshortcuts="?"
          onClick={onShowShortcuts}
        />
      </TooltipProvider>
    </Toolbar>
  );
}
