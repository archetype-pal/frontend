'use client';

import * as React from 'react';
import { Save, Share2, Star, Trash2, X } from 'lucide-react';

import type { AnnotationPopupCapabilities } from '@/types/annotation-viewer';

import { Button } from '@/components/ui/button';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PopupShellProps {
  title: string;
  titleId: string;
  isDraftAnnotation: boolean;
  popupCapabilities: AnnotationPopupCapabilities;
  annotationKindLabel: string;
  collectionLabel: string;

  popupTransform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  zIndex?: number;
  onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;
  width?: number;
  height?: number;
  resizeHandleProps?: React.HTMLAttributes<HTMLSpanElement>;

  isShareUrlVisible: boolean;
  shareUrl: string;
  canSaveAnnotationShortcut?: boolean;
  isSaveAnnotationShortcutDisabled?: boolean;
  canDeleteAnnotationShortcut?: boolean;
  onSaveAnnotationShortcut?: () => void | Promise<void>;
  onDeleteAnnotationShortcut?: () => void | Promise<void>;
  onCopyShareUrl: () => void | Promise<void>;
  onHideShareUrl: () => void;
  onShareSelectedAnnotation: () => void;
  onCloseSelectedAnnotation: () => void;
  isAnnotationInCollection?: boolean;
  onToggleAnnotationCollection?: () => void;

  children: React.ReactNode;
}

export function PopupShell({
  title,
  titleId,
  isDraftAnnotation,
  popupCapabilities,
  annotationKindLabel,
  collectionLabel,
  popupTransform,
  dragHandleProps,
  zIndex,
  onPointerDownCapture,
  width,
  height,
  resizeHandleProps,
  isShareUrlVisible,
  shareUrl,
  canSaveAnnotationShortcut = false,
  isSaveAnnotationShortcutDisabled = false,
  canDeleteAnnotationShortcut = false,
  onSaveAnnotationShortcut,
  onDeleteAnnotationShortcut,
  onCopyShareUrl,
  onHideShareUrl,
  onShareSelectedAnnotation,
  onCloseSelectedAnnotation,
  isAnnotationInCollection = false,
  onToggleAnnotationCollection,
  children,
}: PopupShellProps) {
  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      data-resizable-panel
      className="fixed right-4 top-4 flex flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
      style={{
        transform: popupTransform,
        zIndex,
        width: width ?? 420,
        height,
        maxWidth: '90vw',
        maxHeight: height ? undefined : '85vh',
      }}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b px-4 py-3"
        {...dragHandleProps}
      >
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-base font-semibold">
            {title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {isDraftAnnotation ? (
              <span>
                {popupCapabilities.canPersistDraft ? 'Unsaved draft' : 'Temporary annotation'}
              </span>
            ) : (
              <span>Saved annotation</span>
            )}

            <span className="rounded border px-1.5 py-0.5">{annotationKindLabel}</span>
          </div>
        </div>

        <div
          className="ml-4 flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            {canSaveAnnotationShortcut && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void onSaveAnnotationShortcut?.()}
                    disabled={isSaveAnnotationShortcutDisabled || !onSaveAnnotationShortcut}
                    aria-label="Save Annotation"
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Annotation</TooltipContent>
              </Tooltip>
            )}

            {canDeleteAnnotationShortcut && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => void onDeleteAnnotationShortcut?.()}
                    disabled={!onDeleteAnnotationShortcut}
                    aria-label="Delete Annotation"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Annotation</TooltipContent>
              </Tooltip>
            )}

            {isDraftAnnotation ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onShareSelectedAnnotation}
                    aria-label="Share URL"
                    type="button"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share URL</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={onShareSelectedAnnotation}
                      aria-label="Share URL"
                      type="button"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share URL</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={onToggleAnnotationCollection}
                      disabled={
                        !popupCapabilities.canUseCollection || !onToggleAnnotationCollection
                      }
                      aria-label={collectionLabel}
                      aria-pressed={isAnnotationInCollection}
                      type="button"
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          isAnnotationInCollection && 'fill-amber-400 text-amber-400'
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{collectionLabel}</TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCloseSelectedAnnotation}
                  aria-label="Close annotation popup"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isShareUrlVisible && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="flex-1 text-sm" />
            <Button variant="ghost" size="sm" onClick={onCopyShareUrl} type="button">
              Copy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onHideShareUrl}
              title="Hide URL"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>

      <ResizeHandle {...resizeHandleProps} />
    </div>
  );
}
