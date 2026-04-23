'use client';

import * as React from 'react';
import {
  CheckCheck,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react';

import type { Allograph } from '@/types/allographs';

import type {
  A9sGraphComponent,
  AnnotationCreationKind,
  AnnotationPopupCapabilities,
  AnnotationPopupEditorMode,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
  annotationKind: AnnotationCreationKind;
  popupCapabilities: AnnotationPopupCapabilities;
  metaSummary?: AnnotationPopupMetaSummary;

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

  popupEditorMode: AnnotationPopupEditorMode;

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

  draftInternalNoteText: string;
  draftPublicNoteText: string;
  onDraftInternalNoteTextChange: (value: string) => void;
  onDraftPublicNoteTextChange: (value: string) => void;

  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;

  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;

  hasPositionsTab: boolean;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  selectedNotes: string[];
}

function AnnotationMetaSummaryBlock({ metaSummary }: { metaSummary?: AnnotationPopupMetaSummary }) {
  if (!metaSummary) return null;

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-3">
      <div className="mb-2 text-xs font-semibold text-foreground">Annotation details</div>

      <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 text-xs">
        <div className="text-muted-foreground">Type</div>
        <div>{metaSummary.kindLabel}</div>

        {metaSummary.allographLabel ? (
          <>
            <div className="text-muted-foreground">Allograph</div>
            <div>{metaSummary.allographLabel}</div>
          </>
        ) : null}

        {metaSummary.handLabel ? (
          <>
            <div className="text-muted-foreground">Hand</div>
            <div>{metaSummary.handLabel}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function AnnotationPopupCard({
  title,
  isDraftAnnotation,
  annotationKind,
  popupCapabilities,
  metaSummary,
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
  popupEditorMode,
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
  draftInternalNoteText,
  draftPublicNoteText,
  onDraftInternalNoteTextChange,
  onDraftPublicNoteTextChange,
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

  const isPublicDemoDraft = popupEditorMode === 'public_demo_draft';
  const isPublicExisting = popupEditorMode === 'public_existing';
  const isStandardDraft = popupEditorMode === 'standard_draft';
  const isStandardExisting = popupEditorMode === 'standard_existing';
  const isEditorialDraft = popupEditorMode === 'editorial_draft';

  const standardIdentityFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Allograph</label>
        <SearchableSelect
          options={allographOptions.map((allograph) => ({
            value: String(allograph.id),
            label: allograph.name,
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

  const [isPositionsOpen, setIsPositionsOpen] = React.useState(false);

  const selectedPositionsCount = draftPositionIds.length;

  React.useEffect(() => {
    if (draftPositionIds.length > 0) {
      setIsPositionsOpen(true);
    }
  }, [draftPositionIds]);

  React.useEffect(() => {
    if (draftPositionIds.length === 0) {
      setIsPositionsOpen(false);
    }
  }, [draftAllographId, draftPositionIds.length]);

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

  const editableComponentFeatureSection = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Components / Features</label>

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

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {isDraftAnnotation ? (
              <span>
                {popupCapabilities.canPersistDraft ? 'Unsaved draft' : 'Temporary annotation'}
              </span>
            ) : (
              <span>Saved annotation</span>
            )}

            <span className="rounded border px-1.5 py-0.5">
              {annotationKind === 'editorial' ? 'Editorial' : 'Public'}
            </span>
          </div>
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

      {isPublicDemoDraft ? (
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
      ) : isStandardDraft ? (
        <div className="max-h-[420px] overflow-auto px-4 py-4 space-y-4">
          {standardIdentityFields}

          {editableComponentFeatureSection}

          <div className="space-y-2">
            <div className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setIsPositionsOpen((prev) => !prev)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isPositionsOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}

                  <span className="text-sm font-medium text-foreground">
                    {getPluralLabel('position')}
                  </span>
                </div>

                <span className="text-xs text-muted-foreground">
                  {selectedPositionsCount > 0
                    ? `${selectedPositionsCount} selected`
                    : 'None selected'}
                </span>
              </button>

              {isPositionsOpen && (
                <div className="border-t px-3 py-3">
                  {draftAllographId == null ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Choose an allograph to load the related{' '}
                      {getPluralLabel('position').toLowerCase()}.
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
                    <div className="space-y-2">
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
              )}
            </div>
          </div>

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

          <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" onClick={onCancelDraftAnnotation} type="button">
              Cancel
            </Button>
            <Button onClick={onConfirmDraftAnnotation} type="button">
              OK
            </Button>
          </div>
        </div>
      ) : isStandardExisting ? (
        <div className="max-h-[420px] overflow-auto px-4 py-4 space-y-4">
          {standardIdentityFields}

          {popupCapabilities.canViewEditorMeta && (
            <AnnotationMetaSummaryBlock metaSummary={metaSummary} />
          )}

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Changes remain local until you press the main Save button in the toolbar.
          </div>

          {editableComponentFeatureSection}

          <div className="space-y-2">
            <div className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setIsPositionsOpen((prev) => !prev)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isPositionsOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}

                  <span className="text-sm font-medium text-foreground">
                    {getPluralLabel('position')}
                  </span>
                </div>

                <span className="text-xs text-muted-foreground">
                  {selectedPositionsCount > 0
                    ? `${selectedPositionsCount} selected`
                    : 'None selected'}
                </span>
              </button>

              {isPositionsOpen && (
                <div className="border-t px-3 py-3">
                  {draftAllographId == null ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      Choose an allograph to load the related{' '}
                      {getPluralLabel('position').toLowerCase()}.
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
                    <div className="space-y-2">
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
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>

            {selectedNotes.length > 0 ? (
              <div className="space-y-2 rounded-md border p-3">
                {selectedNotes.map((note, index) => (
                  <div key={`${index}-${note}`} className="text-sm text-muted-foreground">
                    {note}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                No notes available.
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Editing notes for existing standard annotations is not wired yet.
            </p>
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
      ) : isEditorialDraft ? (
        <div className="max-h-[360px] overflow-auto px-4 py-4 space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Editorial annotation draft. Persistence will be wired in a later step.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Internal note</label>
            <textarea
              value={draftInternalNoteText}
              onChange={(e) => onDraftInternalNoteTextChange(e.target.value)}
              placeholder="Type internal note"
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Public note</label>
            <textarea
              value={draftPublicNoteText}
              onChange={(e) => onDraftPublicNoteTextChange(e.target.value)}
              placeholder="Type public note"
              rows={4}
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
      ) : isPublicExisting ? (
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
      ) : null}
    </div>
  );
}
