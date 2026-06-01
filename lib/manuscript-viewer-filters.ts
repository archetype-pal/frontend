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

/** Which annotation layer(s) the viewer is showing (effective for this image). */
export type FilterViewMode = 'allograph' | 'text' | 'both';

export interface VisibilityFilterContext {
  /** Both allograph + hand filter sets have finished their first-load seeding. */
  ready: boolean;
  filters: VisibilityFilterState;
  /** Whether any allograph filter ids are available for this image. */
  hasAllographFilters: boolean;
  hasHandFilters: boolean;
  /**
   * Active annotation view. The glyph (allograph) layer shows in 'allograph' and
   * 'both'; text-region annotations show in 'text' and 'both'. In 'text' the
   * glyph layer is hidden entirely so the text annotator reads uncluttered.
   */
  viewMode: FilterViewMode;
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

  // Text-region annotations back the transcription↔image link; they belong to
  // the text layer (shown in 'text' / 'both', hidden in 'allograph').
  if (meta?.annotationType === 'text') return ctx.viewMode !== 'allograph';

  // Glyph/allograph layer is hidden in the pure 'text' view.
  if (ctx.viewMode === 'text') return false;

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
