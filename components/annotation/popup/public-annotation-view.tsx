'use client';

import type { AnnotationPopupMetaSummary } from '@/types/annotation-viewer';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { AnnotationDetailOverview } from './read-only-detail-sections';
import type { PopupTab, SelectedComponentGroup } from './types';

interface PublicAnnotationViewProps {
  metaSummary?: AnnotationPopupMetaSummary;
  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  selectedNotes: string[];
}

export function PublicAnnotationView({
  metaSummary,
  popupTab,
  onPopupTabChange,
  selectedComponentGroups,
  selectedPositionLabels,
  selectedNotes,
}: PublicAnnotationViewProps) {
  const publicPopupTab = popupTab === 'notes' ? 'notes' : 'details';

  return (
    <Tabs
      value={publicPopupTab}
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
          <AnnotationDetailOverview
            metaSummary={metaSummary}
            selectedComponentGroups={selectedComponentGroups}
            selectedPositionLabels={selectedPositionLabels}
          />
        </TabsContent>

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
  );
}
