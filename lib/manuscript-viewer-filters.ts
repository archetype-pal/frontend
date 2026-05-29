/**
 * Pure annotation-visibility filter logic, extracted from manuscript-viewer.tsx
 * (Track D1). The viewer's `annotationVisibilityFilter` predicate and its
 * "is the filter doing anything?" flag are the trickiest branch of the viewer,
 * so the decision logic lives here, closure-free and unit-tested. The component
 * (and the filters hook) supply the canonical annotation's meta + draft flag.
 */

export interface VisibilityFilterState {
  allographIds: number[];
  handIds: number[];
  showEditorial: boolean;
  showPublicAnnotations: boolean;
}

export interface AnnotationFilterMeta {
  annotationType?: string;
  allographId?: number | null;
  handId?: number | null;
}

export interface VisibilityFilterContext {
  /** Both allograph + hand filter sets have finished their first-load seeding. */
  ready: boolean;
  filters: VisibilityFilterState;
  /** Whether any allograph filter ids are available for this image. */
  hasAllographFilters: boolean;
  hasHandFilters: boolean;
  /** Text-region annotations are only shown while the transcription panel is open. */
  isTextPanelOpen: boolean;
}

/**
 * Whether a single annotation passes the current visibility filters.
 * `meta` is the canonical annotation's `_meta`; `isDraft` is `!isDbId(id)`.
 */
export function passesVisibilityFilter(
  meta: AnnotationFilterMeta | undefined,
  isDraft: boolean,
  ctx: VisibilityFilterContext
): boolean {
  // Until the filter sets have seeded, show everything (avoids a flash of
  // hidden annotations on first load).
  if (!ctx.ready) return true;

  // Text-region annotations back the transcription↔image link; show them only
  // while the text panel is open so the standard view stays uncluttered.
  if (meta?.annotationType === 'text') return ctx.isTextPanelOpen;

  const isExplicitEditorial = meta?.annotationType === 'editorial';

  const kindPass = isExplicitEditorial
    ? ctx.filters.showEditorial
    : isDraft
      ? ctx.filters.showPublicAnnotations
      : true;

  const allographId = meta?.allographId;
  const handId = meta?.handId;

  const allographPass =
    !ctx.hasAllographFilters ||
    allographId == null ||
    ctx.filters.allographIds.includes(allographId);

  const handPass = !ctx.hasHandFilters || handId == null || ctx.filters.handIds.includes(handId);

  return kindPass && allographPass && handPass;
}

export interface VisibilityFilterActiveInput {
  ready: boolean;
  allAllographFiltersSelected: boolean;
  allHandFiltersSelected: boolean;
  canViewEditorialControls: boolean;
  showEditorial: boolean;
  showPublicAnnotations: boolean;
}

/** Whether the visibility filter is narrowing the view (drives the UI "active" pip). */
export function computeVisibilityFilterActive({
  ready,
  allAllographFiltersSelected,
  allHandFiltersSelected,
  canViewEditorialControls,
  showEditorial,
  showPublicAnnotations,
}: VisibilityFilterActiveInput): boolean {
  return (
    ready &&
    (!allAllographFiltersSelected ||
      !allHandFiltersSelected ||
      (canViewEditorialControls && !showEditorial) ||
      !showPublicAnnotations)
  );
}
