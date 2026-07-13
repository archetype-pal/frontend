'use client';

import { useTranslations } from 'next-intl';

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
  const t = useTranslations('annotation');

  if (selectedComponentGroups.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">{t('popup.readOnly.noComponentsDefined')}</div>
    );
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
            <div className="text-sm text-muted-foreground">
              {t('popup.readOnly.noFeaturesSelected')}
            </div>
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
  const t = useTranslations('annotation');

  if (selectedPositionLabels.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">{t('popup.readOnly.noPositionsDefined')}</div>
    );
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
  showMetaSummary = true,
}: {
  metaSummary?: AnnotationPopupMetaSummary;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  /**
   * Whether to render the Type/Allograph/Hand recap block. Off in the editable
   * editor, where Allograph + Hand already appear as editable selectors above —
   * the recap would just repeat them. Kept on for the read-only public view,
   * which is the only place those values are shown.
   */
  showMetaSummary?: boolean;
}) {
  const t = useTranslations('annotation');
  const { getPluralLabel } = useModelLabels();

  return (
    <div className="space-y-4">
      {showMetaSummary ? <AnnotationMetaSummaryBlock metaSummary={metaSummary} /> : null}

      {selectedComponentGroups.length > 0 ? (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-foreground">
            {t('popup.readOnly.componentsAndFeatures')}
          </div>
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
