'use client';

import {
  BookOpenText,
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
  hasTexts: boolean;
  isTextPanelOpen: boolean;
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
  onToggleTextPanel: () => void;
  onCreateAnnotation: (kind: AnnotationCreationKind) => void;
  onSave: () => void;
  onDeleteTool: () => void;
  onModifyTool: () => void;
}

/** The floating viewer tool rail (full-screen, pan, zoom, draw, save, …). */
export function ViewerToolbar({
  toolbarPosition,
  isFullScreen,
  activeTool,
  currentCreationKind,
  hasTexts,
  isTextPanelOpen,
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
  onToggleTextPanel,
  onCreateAnnotation,
  onSave,
  onDeleteTool,
  onModifyTool,
}: ViewerToolbarProps) {
  return (
    <Toolbar orientation={toolbarPosition}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFullScreen ? 'default' : 'ghost'}
              size="icon"
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
              aria-keyshortcuts="F Shift+F"
              onClick={onToggleFullScreen}
            >
              <LaptopMinimal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'move' ? 'default' : 'ghost'}
              size="icon"
              aria-label="Select/Drag (g)"
              aria-keyshortcuts="G Shift+G"
              onClick={onMoveTool}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select/Drag (g)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              aria-keyshortcuts="Z Shift+Z ="
              onClick={onZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              aria-keyshortcuts="-"
              onClick={onZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              aria-keyshortcuts="Home"
              onClick={onRefresh}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>

        {hasTexts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isTextPanelOpen ? 'default' : 'ghost'}
                size="icon"
                aria-label={isTextPanelOpen ? 'Hide text' : 'Show text'}
                onClick={onToggleTextPanel}
              >
                <BookOpenText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isTextPanelOpen ? 'Hide text' : 'Show text'}</TooltipContent>
          </Tooltip>
        )}

        {canCreateEditorialAnnotations && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={
                  activeTool === 'draw' && currentCreationKind === 'editorial' ? 'default' : 'ghost'
                }
                size="icon"
                aria-label="Create editorial annotation"
                aria-keyshortcuts="E Shift+E"
                onClick={() => onCreateAnnotation('editorial')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create Editorial Annotation</TooltipContent>
          </Tooltip>
        )}

        {canPersistAnyAnnotations && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Save (s)"
                aria-keyshortcuts="S Shift+S Control+S Meta+S"
                onClick={onSave}
                disabled={unsavedChanges === 0}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (s)</TooltipContent>
          </Tooltip>
        )}

        {canDeleteAnnotations && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'delete' ? 'default' : 'ghost'}
                size="icon"
                aria-label="Delete (x)"
                aria-keyshortcuts="X Delete Shift+Backspace"
                onClick={onDeleteTool}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete (x)</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'modify' ? 'default' : 'ghost'}
              size="icon"
              aria-label="Modify (m)"
              aria-keyshortcuts="M Shift+M"
              onClick={onModifyTool}
            >
              <Expand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modify (m)</TooltipContent>
        </Tooltip>

        {canCreatePublicAnnotations && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={
                  activeTool === 'draw' && currentCreationKind === 'public' ? 'default' : 'ghost'
                }
                size="icon"
                aria-label="Draw (d)"
                aria-keyshortcuts="D Shift+D R Shift+R"
                onClick={() => onCreateAnnotation('public')}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Draw (d)</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </Toolbar>
  );
}
