'use client';

import {
  Expand,
  Hand,
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
  onToggleFullScreen: () => void;
  onMoveTool: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  onCreateAnnotation: (kind: AnnotationCreationKind) => void;
  onSave: () => void;
  onDeleteTool: () => void;
  onModifyTool: () => void;
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
  onToggleFullScreen,
  onMoveTool,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onCreateAnnotation,
  onSave,
  onDeleteTool,
  onModifyTool,
}: ViewerToolbarProps) {
  return (
    <Toolbar orientation={toolbarPosition}>
      <TooltipProvider>
        <ToolbarButton
          icon={LaptopMinimal}
          label={isFullScreen ? 'Exit full screen' : 'Full screen'}
          tooltip={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          keyshortcuts="F Shift+F"
          active={isFullScreen}
          onClick={onToggleFullScreen}
        />

        <ToolbarButton
          icon={Hand}
          label="Select/Drag (g / space)"
          keyshortcuts="G Shift+G Space"
          active={activeTool === 'move'}
          onClick={onMoveTool}
        />

        <ToolbarButton
          icon={ZoomIn}
          label="Zoom in"
          tooltip="Zoom In"
          keyshortcuts="Z Shift+Z ="
          onClick={onZoomIn}
        />

        <ToolbarButton
          icon={ZoomOut}
          label="Zoom out"
          tooltip="Zoom Out"
          keyshortcuts="-"
          onClick={onZoomOut}
        />

        <ToolbarButton icon={RefreshCcw} label="Refresh" keyshortcuts="Home" onClick={onRefresh} />

        {canCreateEditorialAnnotations && (
          <ToolbarButton
            icon={Pencil}
            label="Create editorial annotation"
            tooltip="Create Editorial Annotation"
            keyshortcuts="E Shift+E"
            active={activeTool === 'draw' && currentCreationKind === 'editorial'}
            onClick={() => onCreateAnnotation('editorial')}
          />
        )}

        {canPersistAnyAnnotations && (
          <ToolbarButton
            icon={Save}
            label="Save (s)"
            keyshortcuts="S Shift+S Control+S Meta+S"
            disabled={unsavedChanges === 0}
            onClick={onSave}
          />
        )}

        {canDeleteAnnotations && (
          <ToolbarButton
            icon={Trash2}
            label="Delete (x)"
            keyshortcuts="X Delete Shift+Backspace"
            active={activeTool === 'delete'}
            onClick={onDeleteTool}
          />
        )}

        <ToolbarButton
          icon={Expand}
          label="Modify (m)"
          keyshortcuts="M Shift+M"
          active={activeTool === 'modify'}
          onClick={onModifyTool}
        />

        {canCreatePublicAnnotations && (
          <ToolbarButton
            icon={SquarePen}
            label="Draw (d / space)"
            keyshortcuts="D Shift+D R Shift+R Space"
            active={activeTool === 'draw' && currentCreationKind === 'public'}
            onClick={() => onCreateAnnotation('public')}
          />
        )}
      </TooltipProvider>
    </Toolbar>
  );
}
