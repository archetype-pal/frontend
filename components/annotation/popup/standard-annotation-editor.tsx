'use client';

import * as React from 'react';
import { CheckCheck, RotateCcw, Sparkles } from 'lucide-react';

import type { Allograph } from '@/types/allographs';
import type {
  A9sGraphComponent,
  AnnotationPopupCapabilities,
  AnnotationPopupMetaSummary,
} from '@/types/annotation-viewer';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { isEditableTarget } from '@/hooks/use-hotkeys';
import { SearchableSelect, type SearchableSelectHandle } from '@/components/ui/searchable-select';
import { useModelLabels } from '@/contexts/model-labels-context';
import { formatAllographLabel } from '@/lib/allograph-labels';

import { AnnotationMetaSummaryBlock } from './meta-summary-block';
import type { PopupTab } from './types';

interface StandardAnnotationEditorProps {
  isExisting: boolean;
  showLocalHint: boolean;
  isActive: boolean;
  hasLocalChanges: boolean;
  popupCapabilities: AnnotationPopupCapabilities;
  metaSummary?: AnnotationPopupMetaSummary;

  allographOptions: Allograph[];
  handOptions: Array<{ id: number; name: string }>;
  draftAllographId: number | null;
  draftHandId: number | null;
  onDraftAllographIdChange: (value: number | null) => void;
  onDraftHandIdChange: (value: number | null) => void;

  draftGraphcomponentSet: A9sGraphComponent[];
  onDraftGraphcomponentSetChange: (value: A9sGraphComponent[]) => void;

  draftPositionIds: number[];
  onDraftPositionIdsChange: (value: number[]) => void;

  draftNoteText: string;
  onDraftNoteTextChange: (value: string) => void;

  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;

  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;
}

export function StandardAnnotationEditor({
  isExisting,
  showLocalHint,
  isActive,
  hasLocalChanges,
  popupCapabilities,
  metaSummary,
  allographOptions,
  handOptions,
  draftAllographId,
  draftHandId,
  onDraftAllographIdChange,
  onDraftHandIdChange,
  draftGraphcomponentSet,
  onDraftGraphcomponentSetChange,
  draftPositionIds,
  onDraftPositionIdsChange,
  draftNoteText,
  onDraftNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
  popupTab,
  onPopupTabChange,
}: StandardAnnotationEditorProps) {
  const { getPluralLabel } = useModelLabels();
  const allographSelectRef = React.useRef<SearchableSelectHandle>(null);

  const standardPopupTab = ['details', 'components', 'positions', 'notes'].includes(popupTab)
    ? popupTab
    : 'details';

  React.useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key.toLowerCase() !== 'a') return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      allographSelectRef.current?.open();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const standardIdentityFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Allograph</label>
        <SearchableSelect
          ref={allographSelectRef}
          options={allographOptions.map((allograph) => ({
            value: String(allograph.id),
            label: formatAllographLabel(allograph),
          }))}
          value={draftAllographId != null ? String(draftAllographId) : null}
          onValueChange={(value) => onDraftAllographIdChange(value ? Number(value) : null)}
          placeholder="Choose an allograph"
          searchPlaceholder="Search allographs..."
          emptyText="No allographs found."
          clearLabel="Choose an allograph"
          contentClassName="z-[250]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Hand</label>
        <Select
          value={draftHandId != null ? String(draftHandId) : '__unset__'}
          onValueChange={(value) =>
            onDraftHandIdChange(value === '__unset__' ? null : Number(value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a hand" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value="__unset__">Choose a hand</SelectItem>
            {handOptions.map((hand) => (
              <SelectItem key={hand.id} value={String(hand.id)}>
                {hand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const selectedAllograph =
    draftAllographId != null
      ? (allographOptions.find((allograph) => allograph.id === draftAllographId) ?? null)
      : null;

  const selectedPositionsCount = draftPositionIds.length;

  const isComponentSelected = (componentId: number) =>
    draftGraphcomponentSet.some((component) => component.component === componentId);

  const toggleComponentSelection = (
    componentId: number,
    componentName: string,
    checked: boolean,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>
  ) => {
    if (checked) {
      if (isComponentSelected(componentId)) return;

      const defaultFeatures = availableFeatures.filter((feature) => feature.set_by_default);

      onDraftGraphcomponentSetChange([
        ...draftGraphcomponentSet,
        {
          component: componentId,
          componentName,
          features: defaultFeatures.map((feature) => feature.id),
          featureDetails: defaultFeatures.map((feature) => ({
            id: feature.id,
            name: feature.name,
          })),
        },
      ]);
      return;
    }

    onDraftGraphcomponentSetChange(
      draftGraphcomponentSet.filter((component) => component.component !== componentId)
    );
  };

  const setComponentFeatures = (
    componentId: number,
    componentName: string,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>,
    nextFeatureIds: number[]
  ) => {
    const existingComponent = draftGraphcomponentSet.find(
      (component) => component.component === componentId
    );

    if (!existingComponent) return;

    const nextFeatureIdSet = new Set(nextFeatureIds);

    const nextFeatureDetails = availableFeatures
      .filter((feature) => nextFeatureIdSet.has(feature.id))
      .map((feature) => ({
        id: feature.id,
        name: feature.name,
      }));

    const nextGraphcomponentSet = draftGraphcomponentSet.map((component) => {
      if (component.component !== componentId) return component;

      return {
        ...component,
        componentName,
        features: nextFeatureIds,
        featureDetails: nextFeatureDetails,
      };
    });

    onDraftGraphcomponentSetChange(nextGraphcomponentSet);
  };

  const toggleFeatureSelection = (
    componentId: number,
    componentName: string,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>,
    featureId: number,
    checked: boolean
  ) => {
    const existingComponent = draftGraphcomponentSet.find(
      (component) => component.component === componentId
    );

    if (!existingComponent) return;

    const nextFeatureIds = checked
      ? Array.from(new Set([...(existingComponent.features ?? []), featureId]))
      : (existingComponent.features ?? []).filter((id) => id !== featureId);

    setComponentFeatures(componentId, componentName, availableFeatures, nextFeatureIds);
  };

  const checkAllFeatures = (
    componentId: number,
    componentName: string,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>
  ) => {
    setComponentFeatures(
      componentId,
      componentName,
      availableFeatures,
      availableFeatures.map((feature) => feature.id)
    );
  };

  const uncheckAllFeatures = (
    componentId: number,
    componentName: string,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>
  ) => {
    setComponentFeatures(componentId, componentName, availableFeatures, []);
  };

  const checkDefaultFeatures = (
    componentId: number,
    componentName: string,
    availableFeatures: Array<{ id: number; name: string; set_by_default: boolean }>
  ) => {
    setComponentFeatures(
      componentId,
      componentName,
      availableFeatures,
      availableFeatures.filter((feature) => feature.set_by_default).map((feature) => feature.id)
    );
  };

  const togglePositionId = (positionId: number, checked: boolean) => {
    onDraftPositionIdsChange(
      checked
        ? Array.from(new Set([...draftPositionIds, positionId]))
        : draftPositionIds.filter((id) => id !== positionId)
    );
  };

  const standardPositionsSection = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground">{getPluralLabel('position')}</label>
        <span className="text-xs text-muted-foreground">
          {selectedPositionsCount > 0 ? `${selectedPositionsCount} selected` : 'None selected'}
        </span>
      </div>

      {draftAllographId == null ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Choose an allograph to load the related {getPluralLabel('position').toLowerCase()}.
        </div>
      ) : !selectedAllograph ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          No allograph data available.
        </div>
      ) : selectedAllograph.positions.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          No {getPluralLabel('position').toLowerCase()} are defined for this allograph.
        </div>
      ) : (
        <div className="space-y-2 rounded-md border p-3">
          {selectedAllograph.positions.map((position) => (
            <label
              key={position.id}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={draftPositionIds.includes(position.id)}
                onChange={(e) => togglePositionId(position.id, e.target.checked)}
              />
              <span>{position.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const standardNotesEditor = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Notes</label>
      <textarea
        value={draftNoteText}
        onChange={(e) => onDraftNoteTextChange(e.target.value)}
        placeholder="Type note"
        rows={5}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );

  const standardFooter = (
    <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
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
  );

  const editableComponentFeatureSection = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Components</label>

      {draftAllographId == null ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Choose an allograph to load the related components and features.
        </div>
      ) : !selectedAllograph ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          No allograph data available.
        </div>
      ) : selectedAllograph.components.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          No components are defined for this allograph.
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-3">
          {selectedAllograph.components.map((component) => {
            const selectedComponent = draftGraphcomponentSet.find(
              (item) => item.component === component.component_id
            );

            const defaultFeatureCount = component.features.filter(
              (feature) => feature.set_by_default
            ).length;
            const selectedFeatureCount = selectedComponent?.features?.length ?? 0;
            const totalFeatureCount = component.features.length;

            return (
              <div key={component.component_id} className="space-y-2 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedComponent)}
                    onChange={(e) =>
                      toggleComponentSelection(
                        component.component_id,
                        component.component_name,
                        e.target.checked,
                        component.features
                      )
                    }
                  />
                  <span>{component.component_name}</span>
                </label>

                {selectedComponent ? (
                  component.features.length > 0 ? (
                    <div className="ml-6 space-y-2">
                      <div className="rounded-md border bg-muted/20 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            {totalFeatureCount > 0 ? (
                              <>
                                <span className="font-medium text-foreground">
                                  {selectedFeatureCount}
                                </span>
                                {` / ${totalFeatureCount} selected`}
                                {defaultFeatureCount > 0 ? ` · ${defaultFeatureCount} default` : ''}
                              </>
                            ) : (
                              'No features available'
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() =>
                                checkAllFeatures(
                                  component.component_id,
                                  component.component_name,
                                  component.features
                                )
                              }
                            >
                              <CheckCheck className="mr-1 h-3.5 w-3.5" />
                              Check all
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() =>
                                uncheckAllFeatures(
                                  component.component_id,
                                  component.component_name,
                                  component.features
                                )
                              }
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Uncheck all
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              disabled={defaultFeatureCount === 0}
                              title={
                                defaultFeatureCount === 0
                                  ? 'No default features are defined for this component'
                                  : 'Select only the default features for this component'
                              }
                              onClick={() =>
                                checkDefaultFeatures(
                                  component.component_id,
                                  component.component_name,
                                  component.features
                                )
                              }
                            >
                              <Sparkles className="mr-1 h-3.5 w-3.5" />
                              Check defaults
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {component.features.map((feature) => {
                          const checked = (selectedComponent.features ?? []).includes(feature.id);

                          return (
                            <label
                              key={feature.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  toggleFeatureSelection(
                                    component.component_id,
                                    component.component_name,
                                    component.features,
                                    feature.id,
                                    e.target.checked
                                  )
                                }
                              />
                              <span>{feature.name}</span>
                              {feature.set_by_default ? (
                                <span className="rounded border px-1.5 py-0.5 text-[10px]">
                                  default
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="ml-6 text-sm text-muted-foreground">
                      This component has no selectable features.
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Tabs
      value={standardPopupTab}
      onValueChange={(value) => onPopupTabChange(value as PopupTab)}
      className="w-full"
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
            value="components"
            className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                data-[state=active]:border data-[state=active]:bg-background
                data-[state=active]:shadow-sm"
          >
            Components
          </TabsTrigger>

          <TabsTrigger
            value="positions"
            className="h-8 rounded-md border border-transparent px-3 text-sm font-medium
                data-[state=active]:border data-[state=active]:bg-background
                data-[state=active]:shadow-sm"
          >
            {getPluralLabel('position')}
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

      <div className="max-h-[420px] overflow-auto px-4 py-4">
        <TabsContent value="details" className="mt-0">
          {isExisting ? (
            <div className="space-y-4">
              {standardIdentityFields}

              {popupCapabilities.canViewEditorMeta && (
                <AnnotationMetaSummaryBlock metaSummary={metaSummary} />
              )}

              {showLocalHint ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  Press OK to keep changes local for the main toolbar Save, or use Save Annotation
                  in this popup header to save immediately.
                </div>
              ) : null}
            </div>
          ) : (
            standardIdentityFields
          )}
        </TabsContent>

        <TabsContent value="components" className="mt-0">
          {editableComponentFeatureSection}
        </TabsContent>

        <TabsContent value="positions" className="mt-0">
          {standardPositionsSection}
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          {standardNotesEditor}
        </TabsContent>
      </div>

      {standardFooter}
    </Tabs>
  );
}
