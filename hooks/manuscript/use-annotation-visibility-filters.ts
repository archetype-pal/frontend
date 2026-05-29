'use client';

import * as React from 'react';

import { includesAllIds, isDbId, toggleNumericId } from '@/lib/annotation-popup-utils';
import {
  computeVisibilityFilterActive,
  passesVisibilityFilter,
} from '@/lib/manuscript-viewer-filters';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta, AnnotationVisibilityFilters } from '@/types/annotation-viewer';

interface UseAnnotationVisibilityFiltersArgs {
  imageId: string;
  availableAllographFilterIds: number[];
  availableHandFilterIds: number[];
  a9sSnapshotLength: number;
  baseDataReady: boolean;
  handsLoaded: boolean;
  isTextPanelOpen: boolean;
  canViewEditorialControls: boolean;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;
}

const DEFAULT_FILTERS: AnnotationVisibilityFilters = {
  allographIds: [],
  handIds: [],
  showEditorial: true,
  showPublicAnnotations: true,
};

/**
 * Owns the annotation-visibility filter cluster, extracted from
 * manuscript-viewer.tsx (Track D1): the filter state, the per-image seeding of
 * allograph/hand filter sets, the toggle handlers, the derived "active" flag,
 * and the per-annotation predicate. It owns its OWN imageId-keyed reset (so it
 * no longer relies on the monolithic imageId reset reaching in).
 */
export function useAnnotationVisibilityFilters({
  imageId,
  availableAllographFilterIds,
  availableHandFilterIds,
  a9sSnapshotLength,
  baseDataReady,
  handsLoaded,
  isTextPanelOpen,
  canViewEditorialControls,
  getCanonicalAnnotation,
}: UseAnnotationVisibilityFiltersArgs) {
  const [visibilityFilters, setVisibilityFilters] =
    React.useState<AnnotationVisibilityFilters>(DEFAULT_FILTERS);
  const [allographFiltersInitialized, setAllographFiltersInitialized] = React.useState(false);
  const [handFiltersInitialized, setHandFiltersInitialized] = React.useState(false);

  // Reset to defaults when the image changes; the seeding effects below then
  // re-initialise from the new image's allograph/hand sets.
  React.useEffect(() => {
    setVisibilityFilters(DEFAULT_FILTERS);
    setAllographFiltersInitialized(false);
    setHandFiltersInitialized(false);
  }, [imageId]);

  // Seed allograph filters once the image data + allograph set are available.
  React.useEffect(() => {
    if (allographFiltersInitialized) return;
    if (!baseDataReady) return;

    if (a9sSnapshotLength === 0 || availableAllographFilterIds.length > 0) {
      setVisibilityFilters((prev) => ({ ...prev, allographIds: [...availableAllographFilterIds] }));
      setAllographFiltersInitialized(true);
    }
  }, [allographFiltersInitialized, baseDataReady, a9sSnapshotLength, availableAllographFilterIds]);

  // Seed hand filters once the hands list has loaded.
  React.useEffect(() => {
    if (handFiltersInitialized) return;
    if (!handsLoaded) return;

    setVisibilityFilters((prev) => ({ ...prev, handIds: [...availableHandFilterIds] }));
    setHandFiltersInitialized(true);
  }, [handFiltersInitialized, handsLoaded, availableHandFilterIds]);

  const allAllographFiltersSelected = React.useMemo(
    () => includesAllIds(availableAllographFilterIds, visibilityFilters.allographIds),
    [availableAllographFilterIds, visibilityFilters.allographIds]
  );

  const allHandFiltersSelected = React.useMemo(
    () => includesAllIds(availableHandFilterIds, visibilityFilters.handIds),
    [availableHandFilterIds, visibilityFilters.handIds]
  );

  const visibilityFiltersReady = allographFiltersInitialized && handFiltersInitialized;

  const isVisibilityFilterActive = computeVisibilityFilterActive({
    ready: visibilityFiltersReady,
    allAllographFiltersSelected,
    allHandFiltersSelected,
    canViewEditorialControls,
    showEditorial: visibilityFilters.showEditorial,
    showPublicAnnotations: visibilityFilters.showPublicAnnotations,
  });

  const annotationVisibilityFilter = React.useCallback(
    (annotation: A9sAnnotation) => {
      const canonical = getCanonicalAnnotation(annotation);
      return passesVisibilityFilter(canonical._meta, !isDbId(canonical.id), {
        ready: visibilityFiltersReady,
        filters: visibilityFilters,
        hasAllographFilters: availableAllographFilterIds.length > 0,
        hasHandFilters: availableHandFilterIds.length > 0,
        isTextPanelOpen,
      });
    },
    [
      visibilityFiltersReady,
      visibilityFilters,
      availableAllographFilterIds.length,
      availableHandFilterIds.length,
      getCanonicalAnnotation,
      isTextPanelOpen,
    ]
  );

  const handleToggleAllographFilter = React.useCallback((allographId: number) => {
    setVisibilityFilters((prev) => ({
      ...prev,
      allographIds: toggleNumericId(prev.allographIds, allographId),
    }));
  }, []);

  const handleToggleHandFilter = React.useCallback((handId: number) => {
    setVisibilityFilters((prev) => ({
      ...prev,
      handIds: toggleNumericId(prev.handIds, handId),
    }));
  }, []);

  const handleToggleAllAllographFilters = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      allographIds: allAllographFiltersSelected ? [] : [...availableAllographFilterIds],
    }));
  }, [allAllographFiltersSelected, availableAllographFilterIds]);

  const handleToggleAllHandFilters = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      handIds: allHandFiltersSelected ? [] : [...availableHandFilterIds],
    }));
  }, [allHandFiltersSelected, availableHandFilterIds]);

  const handleToggleEditorialVisibility = React.useCallback(() => {
    setVisibilityFilters((prev) => ({ ...prev, showEditorial: !prev.showEditorial }));
  }, []);

  const handleTogglePublicAnnotationsVisibility = React.useCallback(() => {
    setVisibilityFilters((prev) => ({
      ...prev,
      showPublicAnnotations: !prev.showPublicAnnotations,
    }));
  }, []);

  return {
    visibilityFilters,
    allAllographFiltersSelected,
    allHandFiltersSelected,
    isVisibilityFilterActive,
    annotationVisibilityFilter,
    handleToggleAllographFilter,
    handleToggleHandFilter,
    handleToggleAllAllographFilters,
    handleToggleAllHandFilters,
    handleToggleEditorialVisibility,
    handleTogglePublicAnnotationsVisibility,
  };
}
