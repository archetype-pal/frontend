'use client';

import * as React from 'react';
import { Share2, Star, X } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useModelLabels } from '@/contexts/model-labels-context';

type PopupTab = 'components' | 'positions' | 'notes';

type SelectedComponentGroup = {
  componentId: number;
  componentName: string;
  featureNames: string[];
};

interface AnnotationPopupCardProps {
  title: string;
  isDraftAnnotation: boolean;

  popupTransform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  zIndex?: number;
  onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;

  isShareUrlVisible: boolean;
  shareUrl: string;
  onCopyShareUrl: () => void | Promise<void>;
  onHideShareUrl: () => void;
  onShareSelectedAnnotation: () => void;
  onCloseSelectedAnnotation: () => void;

  draftAllographText: string;
  onDraftAllographTextChange: (value: string) => void;

  draftNoteText: string;
  onDraftNoteTextChange: (value: string) => void;

  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;

  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;

  hasPositionsTab: boolean;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  selectedNotes: string[];
}

export function AnnotationPopupCard({
  title,
  isDraftAnnotation,
  popupTransform,
  dragHandleProps,
  zIndex,
  onPointerDownCapture,
  isShareUrlVisible,
  shareUrl,
  onCopyShareUrl,
  onHideShareUrl,
  onShareSelectedAnnotation,
  onCloseSelectedAnnotation,
  draftAllographText,
  onDraftAllographTextChange,
  draftNoteText,
  onDraftNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
  popupTab,
  onPopupTabChange,
  hasPositionsTab,
  selectedComponentGroups,
  selectedPositionLabels,
  selectedNotes,
}: AnnotationPopupCardProps) {
  const { getPluralLabel } = useModelLabels();

  return (
    <div
      className="fixed top-4 right-4 rounded-lg border bg-background shadow-lg"
      style={{
        transform: popupTransform,
        zIndex,
        width: '420px',
        maxWidth: '90vw',
      }}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b px-4 py-3"
        {...dragHandleProps}
      >
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          {isDraftAnnotation && (
            <p className="text-xs text-muted-foreground">Temporary annotation</p>
          )}
        </div>

        <div
          className="ml-4 flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
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
                      disabled
                      aria-label="Add to Collection"
                      type="button"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add to Collection</TooltipContent>
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

      {isDraftAnnotation ? (
        <div className="max-h-[320px] overflow-auto px-4 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Allograph</label>
            <Input
              value={draftAllographText}
              onChange={(e) => onDraftAllographTextChange(e.target.value)}
              placeholder="Type allograph"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Note</label>
            <textarea
              value={draftNoteText}
              onChange={(e) => onDraftNoteTextChange(e.target.value)}
              placeholder="Type note"
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" onClick={onCancelDraftAnnotation} type="button">
              Cancel
            </Button>
            <Button onClick={onConfirmDraftAnnotation} type="button">
              OK
            </Button>
          </div>
        </div>
      ) : (
        <Tabs
          value={popupTab}
          onValueChange={(value) => onPopupTabChange(value as PopupTab)}
          className="w-full"
        >
          <div className="border-b px-4 py-2">
            <TabsList className="h-auto gap-2 bg-transparent p-0">
              <TabsTrigger
                value="components"
                className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                data-[state=active]:border data-[state=active]:bg-background
                data-[state=active]:shadow-sm"
              >
                Components
              </TabsTrigger>

              {hasPositionsTab && (
                <TabsTrigger
                  value="positions"
                  className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                  data-[state=active]:border data-[state=active]:bg-background
                  data-[state=active]:shadow-sm"
                >
                  {getPluralLabel('position')}
                </TabsTrigger>
              )}

              <TabsTrigger
                value="notes"
                className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                data-[state=active]:border data-[state=active]:bg-background
                data-[state=active]:shadow-sm"
              >
                Notes
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="max-h-[320px] overflow-auto px-4 py-4">
            <TabsContent value="components" className="mt-0">
              <div className="space-y-4">
                {selectedComponentGroups.length > 0 ? (
                  selectedComponentGroups.map((group) => (
                    <div key={group.componentId}>
                      <div className="text-sm font-semibold text-foreground">
                        {group.componentName}
                      </div>
                      <Separator className="my-2" />
                      {group.featureNames.length > 0 ? (
                        <div className="space-y-1">
                          {group.featureNames.map((featureName) => (
                            <div
                              key={`${group.componentId}-${featureName}`}
                              className="text-sm text-muted-foreground"
                            >
                              {featureName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No features selected.</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No components defined.</div>
                )}
              </div>
            </TabsContent>

            {hasPositionsTab && (
              <TabsContent value="positions" className="mt-0">
                <div className="space-y-2">
                  {selectedPositionLabels.map((label) => (
                    <div key={label} className="text-sm text-muted-foreground">
                      {label}
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            <TabsContent value="notes" className="mt-0">
              <div className="space-y-2">
                {selectedNotes.length > 0 ? (
                  selectedNotes.map((note, index) => (
                    <div key={`${index}-${note}`} className="text-sm text-muted-foreground">
                      {note}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No notes available.</div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
