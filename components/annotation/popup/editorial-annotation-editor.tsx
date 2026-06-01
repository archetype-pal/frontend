'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useModelLabels } from '@/contexts/model-labels-context';
import type { AnnotationPopupMetaSummary } from '@/types/annotation-viewer';

import {
  AnnotationDetailOverview,
  ReadOnlyComponentList,
  ReadOnlyPositionList,
} from './read-only-detail-sections';
import type { PopupTab, SelectedComponentGroup } from './types';

interface EditorialAnnotationEditorProps {
  isExisting: boolean;
  hasLocalChanges: boolean;
  metaSummary?: AnnotationPopupMetaSummary;
  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;
  hasPositionsTab: boolean;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  draftInternalNoteText: string;
  onDraftInternalNoteTextChange: (value: string) => void;
  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;
}

export function EditorialAnnotationEditor({
  isExisting,
  hasLocalChanges,
  metaSummary,
  popupTab,
  onPopupTabChange,
  hasPositionsTab,
  selectedComponentGroups,
  selectedPositionLabels,
  draftInternalNoteText,
  onDraftInternalNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
}: EditorialAnnotationEditorProps) {
  const { getPluralLabel } = useModelLabels();
  const hasComponentsTab = selectedComponentGroups.length > 0;
  const editorialPopupTab =
    popupTab === 'notes'
      ? 'notes'
      : popupTab === 'components' && hasComponentsTab
        ? 'components'
        : popupTab === 'positions' && hasPositionsTab
          ? 'positions'
          : 'details';

  return (
    <Tabs
      value={editorialPopupTab}
      onValueChange={(value) => onPopupTabChange(value as PopupTab)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="border-b px-4 py-2">
        <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger
            value="details"
            className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                data-[state=active]:border data-[state=active]:bg-background
                data-[state=active]:shadow-sm"
          >
            Details
          </TabsTrigger>

          {hasComponentsTab && (
            <TabsTrigger
              value="components"
              className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                  data-[state=active]:border data-[state=active]:bg-background
                  data-[state=active]:shadow-sm"
            >
              Components
            </TabsTrigger>
          )}

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

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <TabsContent value="details" className="mt-0">
          <div className="space-y-4">
            <AnnotationDetailOverview
              metaSummary={metaSummary}
              selectedComponentGroups={selectedComponentGroups}
              selectedPositionLabels={selectedPositionLabels}
            />

            {isExisting ? (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Press OK to keep changes local for the main toolbar Save, or use Save Annotation (s)
                in this popup header to save immediately.
              </div>
            ) : null}
          </div>
        </TabsContent>

        {hasComponentsTab && (
          <TabsContent value="components" className="mt-0">
            <ReadOnlyComponentList selectedComponentGroups={selectedComponentGroups} />
          </TabsContent>
        )}

        {hasPositionsTab && (
          <TabsContent value="positions" className="mt-0">
            <ReadOnlyPositionList selectedPositionLabels={selectedPositionLabels} />
          </TabsContent>
        )}

        <TabsContent value="notes" className="mt-0">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Internal note</label>
            <textarea
              value={draftInternalNoteText}
              onChange={(e) => onDraftInternalNoteTextChange(e.target.value)}
              placeholder="Type internal note"
              rows={8}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </TabsContent>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="ghost" onClick={onCancelDraftAnnotation} type="button">
          Cancel
        </Button>
        <Button
          onClick={onConfirmDraftAnnotation}
          disabled={isExisting && !hasLocalChanges}
          type="button"
        >
          OK
        </Button>
      </div>
    </Tabs>
  );
}
