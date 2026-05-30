'use client';

import type {
  AnnotationPopupCapabilities,
  AnnotationPopupMetaSummary,
} from '@/types/annotation-viewer';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useModelLabels } from '@/contexts/model-labels-context';

import { AnnotationMetaSummaryBlock } from './meta-summary-block';
import type { PopupTab, SelectedComponentGroup } from './types';

interface PublicAnnotationViewProps {
  popupCapabilities: AnnotationPopupCapabilities;
  metaSummary?: AnnotationPopupMetaSummary;
  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;
  hasPositionsTab: boolean;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  selectedNotes: string[];
}

export function PublicAnnotationView({
  popupCapabilities,
  metaSummary,
  popupTab,
  onPopupTabChange,
  hasPositionsTab,
  selectedComponentGroups,
  selectedPositionLabels,
  selectedNotes,
}: PublicAnnotationViewProps) {
  const { getPluralLabel } = useModelLabels();

  const publicPopupTab =
    popupTab === 'notes'
      ? 'notes'
      : popupTab === 'positions' && hasPositionsTab
        ? 'positions'
        : 'components';

  return (
    <Tabs
      value={publicPopupTab}
      onValueChange={(value) => onPopupTabChange(value as PopupTab)}
      className="w-full"
    >
      <div className="border-b px-4 py-2">
        <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
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

      {popupCapabilities.canViewEditorMeta && (
        <div className="border-b px-4 py-3">
          <AnnotationMetaSummaryBlock metaSummary={metaSummary} />
        </div>
      )}

      <div className="max-h-[320px] overflow-auto px-4 py-4">
        <TabsContent value="components" className="mt-0">
          <div className="space-y-4">
            {selectedComponentGroups.length > 0 ? (
              selectedComponentGroups.map((group) => (
                <div key={group.componentId}>
                  <div className="text-sm font-semibold text-foreground">{group.componentName}</div>
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
  );
}
