'use client';

import { Separator } from '@/components/ui/separator';
import { useModelLabels } from '@/contexts/model-labels-context';
import type { AnnotationPopupMetaSummary } from '@/types/annotation-viewer';
import { AnnotationMetaSummaryBlock } from './meta-summary-block';
import type { SelectedComponentGroup } from './types';

export function ReadOnlyComponentList({
  selectedComponentGroups,
}: {
  selectedComponentGroups: SelectedComponentGroup[];
}) {
  if (selectedComponentGroups.length === 0) {
    return <div className="text-sm text-muted-foreground">No components defined.</div>;
  }

  return (
    <div className="space-y-4">
      {selectedComponentGroups.map((group) => (
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
      ))}
    </div>
  );
}

export function ReadOnlyPositionList({
  selectedPositionLabels,
}: {
  selectedPositionLabels: string[];
}) {
  if (selectedPositionLabels.length === 0) {
    return <div className="text-sm text-muted-foreground">No positions defined.</div>;
  }

  return (
    <div className="space-y-2">
      {selectedPositionLabels.map((label) => (
        <div key={label} className="text-sm text-muted-foreground">
          {label}
        </div>
      ))}
    </div>
  );
}

export function AnnotationDetailOverview({
  metaSummary,
  selectedComponentGroups,
  selectedPositionLabels,
}: {
  metaSummary?: AnnotationPopupMetaSummary;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
}) {
  const { getPluralLabel } = useModelLabels();

  return (
    <div className="space-y-4">
      <AnnotationMetaSummaryBlock metaSummary={metaSummary} />

      {selectedComponentGroups.length > 0 ? (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Components &amp; features</div>
          <div className="rounded-md border bg-muted/20 px-3 py-3">
            <ReadOnlyComponentList selectedComponentGroups={selectedComponentGroups} />
          </div>
        </section>
      ) : null}

      {selectedPositionLabels.length > 0 ? (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-foreground">{getPluralLabel('position')}</div>
          <div className="rounded-md border bg-muted/20 px-3 py-3">
            <ReadOnlyPositionList selectedPositionLabels={selectedPositionLabels} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
