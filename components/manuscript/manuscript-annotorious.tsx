'use client';

import React, { useEffect, useRef } from 'react';
import type OpenSeadragon from 'openseadragon';
import '@recogito/annotorious/dist/annotorious.min.css';

// ---- Annotation data model ----
export interface Annotation {
  id: string;
  type: 'Annotation';
  body?: {
    value: string;
    type?: string;
    purpose?: string;
  }[];
  target: unknown;
  _meta?: {
    allographId?: number;
    handId?: number;
    numFeatures?: number;
    isDescribed?: boolean;
    annotationType?: string;
    note?: string;
    internalNote?: string;
    graphcomponentSet?: Array<{
      componentName?: string;
      component: number;
      features: number[];
      featureDetails?: { id: number; name: string }[];
    }>;
    positions?: number[];
    positionDetails?: { id: number; name: string }[];
  };
}
type AnnotoriousFactory = typeof import('@recogito/annotorious-openseadragon').default;
type AnnotoriousInstance = ReturnType<AnnotoriousFactory>;

export type ViewerImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
};

function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function buildViewerImageFilter(adjustments: ViewerImageAdjustments): string {
  const { brightness, contrast, saturation } = adjustments;

  if (brightness === 100 && contrast === 100 && saturation === 100) {
    return 'none';
  }

  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
}

const createDraftAnnotationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `#${crypto.randomUUID()}`;
  }

  return `#${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const withDraftAnnotationId = (annotation: Annotation): Annotation => {
  if (annotation.id && annotation.type === 'Annotation') return annotation;

  return {
    ...annotation,
    id: annotation.id || createDraftAnnotationId(),
    type: 'Annotation',
  };
};

// ---- API we expose upward (no ref needed) ----
export type ViewerApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  goHome: () => void;
  panByPixels: (x: number, y: number) => void;
  rotateBy: (degrees: number) => void;
  resetRotation: () => void;
  setImageAdjustments: (adjustments: ViewerImageAdjustments) => void;
  enablePan: () => void;
  enableModify: () => void;
  enableDraw: () => void;
  enableDelete: () => void;
  toggleAnnotations: (visible: boolean) => void;
  getAnnotations: () => Annotation[];
  getSelectedAnnotationIds?: () => string[];
  clearSelectedAnnotationIds?: () => void;
  centerOnAnnotation?: (id: string) => void;
  highlightAnnotations: (ids: string[]) => void;
  clearHighlights: () => void;
  clearSelection: () => void;
  selectAnnotationById?: (id: string) => void;
  removeAnnotationById?: (id: string) => void;
  updateSelectedDraft?: (annotation: Annotation) => Promise<void>;
  saveSelectedDraft?: () => Promise<void>;
};

// ---- Component props ----
interface Props {
  iiifImageUrl: string;
  onCreate?: (annotation: Annotation) => void;
  onUpdate?: (annotation: Annotation) => void;
  onDelete?: (annotation: Annotation, context?: { bulk: boolean }) => void;
  onDeleteMany?: (annotations: Annotation[]) => void;
  /** Delete a text-region (removes the graph + strips its corresp). The Delete
   *  tool dispatches this instead of the glyph delete; fired once per click. */
  onDeleteTextRegion?: (annotation: Annotation) => void;
  onSelect?: (annotation: Annotation | null) => void;
  onSelectionIdsChange?: (ids: string[]) => void;
  exposeApi?: (api: ViewerApi) => void;
  initialAnnotations?: Annotation[];
  disableEditor?: boolean;
  readOnly?: boolean;
  annotationFilter?: (annotation: Annotation) => boolean;
  confirmDelete?: (annotation: Annotation) => boolean;
  confirmDeleteMany?: (annotations: Annotation[]) => boolean;
  allowMultipleSelection?: boolean;
  autoCommitDrawSelections?: boolean;
}

// ---- Component state ----
interface ComponentState {
  hasError: boolean;
  errorMessage: string | null;
  isLoading: boolean;
}

// ---- Component ----
export default function ManuscriptAnnotorious({
  iiifImageUrl,
  onCreate,
  onUpdate,
  onDelete,
  onDeleteMany,
  onDeleteTextRegion,
  onSelect,
  onSelectionIdsChange,
  exposeApi,
  initialAnnotations = [],
  disableEditor = false,
  readOnly = false,
  annotationFilter,
  confirmDelete,
  confirmDeleteMany,
  allowMultipleSelection = false,
  autoCommitDrawSelections = false,
}: Props) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdRef = useRef<OpenSeadragon.Viewer | null>(null);
  const annoRef = useRef<AnnotoriousInstance | null>(null);
  const osdModuleRef = useRef<{
    Rect: new (x: number, y: number, w: number, h: number) => unknown;
    Point: new (x: number, y: number) => OpenSeadragon.Point;
  } | null>(null);
  const onCreateRef = useRef(onCreate);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onDeleteManyRef = useRef(onDeleteMany);
  const onDeleteTextRegionRef = useRef(onDeleteTextRegion);
  const confirmDeleteRef = useRef(confirmDelete);
  const confirmDeleteManyRef = useRef(confirmDeleteMany);
  const onSelectRef = useRef(onSelect);
  const onSelectionIdsChangeRef = useRef(onSelectionIdsChange);
  const exposeApiRef = useRef(exposeApi);
  const annotationFilterRef = useRef<Props['annotationFilter']>(annotationFilter);
  const [state, setState] = React.useState<ComponentState>({
    hasError: false,
    errorMessage: null,
    isLoading: true,
  });

  const selectedDisplayIdRef = useRef<string | null>(null);
  // Last pointer-down position (viewport coords) — used to recover the VISIBLE
  // annotation the user clicked when Annotorious hit-tests a hidden one beneath.
  const lastPointerDownRef = useRef<{ x: number; y: number } | null>(null);
  // Monotonic pointer-down counter + the seq a region-delete last acted on, so a
  // region is deleted exactly ONCE per physical click — Annotorious otherwise
  // re-fires selectAnnotation in a loop while the region stays on the canvas.
  const pointerDownSeqRef = useRef(0);
  const lastHandledDeleteSeqRef = useRef(-1);
  const multiSelectedIdsRef = useRef<Set<string>>(new Set());
  const allowMultipleSelectionRef = useRef(allowMultipleSelection);
  const autoCommitDrawSelectionsRef = useRef(autoCommitDrawSelections);
  const suppressReselectIdRef = useRef<string | null>(null);
  const multiSelectionHandledByClickIdRef = useRef<string | null>(null);
  const isDraftAnnotation = (a: Annotation | null | undefined) =>
    Boolean(a && typeof a.id === 'string' && !a.id.startsWith('db:'));
  const isEditorialAnnotation = (a: Annotation | null | undefined) =>
    a?._meta?.annotationType === 'editorial';
  const isTextRegionAnnotation = (a: Annotation | null | undefined) =>
    a?._meta?.annotationType === 'text';

  const emitSelectionIdsChange = React.useCallback(() => {
    onSelectionIdsChangeRef.current?.(Array.from(multiSelectedIdsRef.current));
  }, []);

  const syncAnnotationClasses = React.useCallback(() => {
    const root = viewerRef.current;
    const anno = annoRef.current;
    if (!root || !anno) return;

    root.querySelectorAll<SVGGElement>('g.a9s-annotation').forEach((el) => {
      el.classList.remove(
        'a9s-described',
        'a9s-undescribed',
        'a9s-current-selected',
        'a9s-multi-selected',
        'a9s-editorial',
        'a9s-draft',
        'a9s-text'
      );
    });

    root.querySelectorAll<SVGGElement>('g.a9s-selection').forEach((el) => {
      el.classList.remove('a9s-described', 'a9s-undescribed', 'a9s-editorial', 'a9s-draft');
    });

    const annotations = (anno.getAnnotations?.() ?? []) as Annotation[];

    annotations.forEach((a) => {
      const el = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${a.id}"]`);
      if (!el) return;

      if (isDraftAnnotation(a)) {
        el.classList.add('a9s-draft');
        return;
      }

      if (isEditorialAnnotation(a)) {
        el.classList.add('a9s-editorial');
        return;
      }

      if (a._meta?.annotationType === 'text') {
        el.classList.add('a9s-text');
        return;
      }

      const isDescribed = a._meta?.isDescribed === true;
      el.classList.add(isDescribed ? 'a9s-described' : 'a9s-undescribed');
    });

    multiSelectedIdsRef.current.forEach((id) => {
      const el = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${id}"]`);
      if (el) {
        el.classList.add('a9s-multi-selected');
      }
    });

    const selectedAnnotation = (anno.getSelected?.() ?? null) as Annotation | null;
    const selectedId = selectedAnnotation?.id || selectedDisplayIdRef.current;
    const selectedIsDraft =
      isDraftAnnotation(selectedAnnotation) ||
      Boolean(selectedDisplayIdRef.current && !selectedDisplayIdRef.current.startsWith('db:'));
    const selectedIsEditorial = !selectedIsDraft && isEditorialAnnotation(selectedAnnotation);

    root
      .querySelectorAll<SVGGElement>(
        'g.a9s-selection, g.a9s-annotation.selected, g.a9s-annotation.editable'
      )
      .forEach((el) => {
        el.classList.remove('a9s-described', 'a9s-undescribed', 'a9s-editorial', 'a9s-draft');

        if (selectedIsDraft) {
          el.classList.add('a9s-draft');
        } else if (selectedIsEditorial) {
          el.classList.add('a9s-editorial');
        }
      });

    if (selectedId) {
      const baseEl = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${selectedId}"]`);
      if (baseEl) {
        baseEl.classList.add('a9s-current-selected');
      }
    }

    root.querySelectorAll<SVGGElement>('g.a9s-selection').forEach((el) => {
      if (selectedIsDraft) {
        el.classList.add('a9s-draft');
      } else if (selectedIsEditorial) {
        el.classList.add('a9s-editorial');
      }
    });
  }, []);

  const applyAnnotationVisibility = React.useCallback(() => {
    const root = viewerRef.current;
    const anno = annoRef.current;
    if (!root || !anno) return;

    const predicate = annotationFilterRef.current;
    const annotations = (anno.getAnnotations?.() ?? []) as Annotation[];
    const visibleById = new Map<string, boolean>();

    annotations.forEach((annotation) => {
      visibleById.set(annotation.id, predicate ? predicate(annotation) : true);
    });

    root.querySelectorAll<SVGGElement>('g.a9s-annotation').forEach((el) => {
      const id = el.dataset.id ?? '';
      const visible = visibleById.get(id) ?? true;

      el.style.display = visible ? '' : 'none';
      el.classList.toggle('a9s-hidden-by-filter', !visible);
    });

    const selectedId = anno.getSelected?.()?.id || selectedDisplayIdRef.current;

    root.querySelectorAll<SVGGElement>('g.a9s-selection').forEach((el) => {
      const visible = !selectedId || (visibleById.get(selectedId) ?? true);

      el.style.display = visible ? '' : 'none';
      el.classList.toggle('a9s-hidden-by-filter', !visible);
    });
  }, []);

  const queueSyncAnnotationClasses = React.useCallback(() => {
    requestAnimationFrame(() => {
      syncAnnotationClasses();
      applyAnnotationVisibility();

      requestAnimationFrame(() => {
        syncAnnotationClasses();
        applyAnnotationVisibility();
      });
    });
  }, [syncAnnotationClasses, applyAnnotationVisibility]);

  // keep refs up to date without re-running the heavy OSD effect
  useEffect(() => {
    onCreateRef.current = onCreate;
  }, [onCreate]);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);
  useEffect(() => {
    onDeleteManyRef.current = onDeleteMany;
  }, [onDeleteMany]);
  useEffect(() => {
    onDeleteTextRegionRef.current = onDeleteTextRegion;
  }, [onDeleteTextRegion]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    exposeApiRef.current = exposeApi;
  }, [exposeApi]);
  useEffect(() => {
    annotationFilterRef.current = annotationFilter;
    queueSyncAnnotationClasses();
  }, [annotationFilter, queueSyncAnnotationClasses]);

  useEffect(() => {
    onSelectionIdsChangeRef.current = onSelectionIdsChange;
  }, [onSelectionIdsChange]);

  useEffect(() => {
    allowMultipleSelectionRef.current = allowMultipleSelection;
  }, [allowMultipleSelection]);

  useEffect(() => {
    autoCommitDrawSelectionsRef.current = autoCommitDrawSelections;
  }, [autoCommitDrawSelections]);

  useEffect(() => {
    confirmDeleteRef.current = confirmDelete;
  }, [confirmDelete]);
  useEffect(() => {
    confirmDeleteManyRef.current = confirmDeleteMany;
  }, [confirmDeleteMany]);

  useEffect(() => {
    if (allowMultipleSelection) return;

    if (multiSelectedIdsRef.current.size > 0) {
      multiSelectedIdsRef.current.clear();
      emitSelectionIdsChange();
      queueSyncAnnotationClasses();
    }
  }, [allowMultipleSelection, emitSelectionIdsChange, queueSyncAnnotationClasses]);

  // also keep the latest initial annotations in a ref,
  // so the OSD 'open' handler doesn't capture an old (empty) array

  const initialAnnotsRef = useRef<Annotation[]>([]);
  useEffect(() => {
    initialAnnotsRef.current = Array.isArray(initialAnnotations) ? initialAnnotations : [];
  }, [initialAnnotations]);

  // ---- Initialize OSD + Annotorious once per iiifImageUrl ----
  useEffect(() => {
    if (!viewerRef.current) return;

    let isMounted = true;
    let viewer: InstanceType<typeof OpenSeadragon.Viewer> | null = null;

    const baseUrl = iiifImageUrl.replace(/\/info\.json$/, '');
    const tileSourceUrl = `${baseUrl}/info.json`;

    const opts = {
      element: viewerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      showFullPageControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showNavigator: true,
      visibilityRatio: 1,
      constrainDuringPan: true,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: false,
        dragToPan: true,
        scrollToZoom: true,
      },
    };

    void (async () => {
      let tileSources: string | Record<string, unknown> = tileSourceUrl;
      let OpenSeadragonCtor: {
        (options: Record<string, unknown>): OpenSeadragon.Viewer;
        Rect: new (x: number, y: number, w: number, h: number) => unknown;
        Point: new (x: number, y: number) => OpenSeadragon.Point;
      };
      let AnnotoriousCtor: AnnotoriousFactory;
      try {
        const [osdModule, annoModule] = await Promise.all([
          import('openseadragon'),
          import('@recogito/annotorious-openseadragon'),
        ]);
        OpenSeadragonCtor = osdModule.default as unknown as {
          (options: Record<string, unknown>): OpenSeadragon.Viewer;
          Rect: new (x: number, y: number, w: number, h: number) => unknown;
          Point: new (x: number, y: number) => OpenSeadragon.Point;
        };
        AnnotoriousCtor = annoModule.default;
        osdModuleRef.current = OpenSeadragonCtor;
      } catch (err) {
        if (isMounted) {
          setState({
            hasError: true,
            errorMessage: `Failed to load viewer libraries: ${err instanceof Error ? err.message : String(err)}`,
            isLoading: false,
          });
        }
        return;
      }
      if (baseUrl.includes('/iiif-proxy')) {
        try {
          const res = await fetch(tileSourceUrl);
          if (!res.ok) throw new Error(`IIIF info: ${res.status}`);
          const obj = (await res.json()) as Record<string, unknown>;
          // Pass SIPI's NATIVE info.json through to OpenSeadragon (v6 supports
          // both IIIF Image API 2.x and 3.0); only rewrite the identifier so tile
          // requests route through the proxy. Do NOT downgrade 3.0 → 2.x: SIPI v5
          // is IIIF-3-strict and rejects the 2.x `full` size with 400 ("IIIF url
          // not correctly formatted"); the 3.0 descriptor makes OSD request the
          // valid `max` size instead. (`id` is the 3.0 key, `@id` the 2.x one.)
          tileSources = { ...obj, id: baseUrl, '@id': baseUrl };
        } catch (err) {
          if (isMounted) {
            setState({
              hasError: true,
              errorMessage: `Failed to load IIIF info: ${err instanceof Error ? err.message : String(err)}`,
              isLoading: false,
            });
          }
          return;
        }
      }
      if (!isMounted) return;

      viewer = OpenSeadragonCtor({ ...opts, tileSources });
      osdRef.current = viewer;

      viewer.addHandler('open-failed', (event: { message?: string }) => {
        if (!isMounted) return;
        setState({
          hasError: true,
          errorMessage: `Failed to open image: ${event?.message ?? 'unknown'}. URL: ${tileSourceUrl}`,
          isLoading: false,
        });
      });

      viewer.addHandler('open', () => {
        if (!isMounted) return;
        setState((prev) => ({ ...prev, isLoading: false, hasError: false }));

        if (!annoRef.current) {
          const annoOptions: NonNullable<Parameters<AnnotoriousFactory>[1]> = disableEditor
            ? { disableEditor: true, readOnly }
            : { widgets: [{ widget: 'COMMENT' as const }], readOnly };
          const anno = AnnotoriousCtor(viewer, annoOptions);

          annoRef.current = anno;
          anno.readOnly = true;

          const toApplyNow = Array.isArray(initialAnnotsRef.current)
            ? initialAnnotsRef.current
            : [];
          anno.setAnnotations(toApplyNow);

          queueSyncAnnotationClasses();

          let currentMode: 'pan' | 'modify' | 'draw' | 'delete' = 'pan';
          let deleteHandler: ((a: Annotation | null, element?: unknown) => void) | null = null;
          let rearmHandler: (() => void) | null = null;

          // While drawing, OSD must NOT pan on drag — otherwise rubber-banding a
          // box pans the image instead (only visible zoomed in, where there's
          // room to pan). Annotorious's setDrawingEnabled doesn't disable OSD's
          // own drag-to-pan, so we toggle it per tool: off for draw, on for the
          // navigation-friendly tools. Scroll-to-zoom is left untouched.
          const setOsdDragToPan = (enabled: boolean) => {
            // gestureSettingsMouse is a real OSD viewer property but missing from
            // the @types; it's the live object the MouseTracker reads per drag.
            const settings = (
              osdRef.current as unknown as {
                gestureSettingsMouse?: { dragToPan?: boolean };
              } | null
            )?.gestureSettingsMouse;
            if (settings) settings.dragToPan = enabled;
          };

          // A filtered-out annotation (e.g. a glyph hidden in text view) must not
          // be interactive. Annotorious hit-tests its OWN store and ignores our
          // CSS display:none, so without this a click on a region selects the
          // glyph hidden beneath it and opens the glyph popup — the reported bug.
          const isAnnotationVisible = (a: Annotation | null | undefined) => {
            if (!a) return true;
            const predicate = annotationFilterRef.current;
            return predicate ? predicate(a) : true;
          };

          // Record where the user pressed so we can recover the visible annotation
          // when Annotorious resolves a click to a hidden one nested beneath it.
          viewerRef.current?.addEventListener(
            'pointerdown',
            (e) => {
              lastPointerDownRef.current = { x: e.clientX, y: e.clientY };
              pointerDownSeqRef.current += 1;
            },
            true
          );

          // The smallest VISIBLE annotation whose rendered box contains the point
          // — i.e. the region the user actually clicked, skipping hidden glyphs.
          const visibleAnnotationAtPoint = (x: number, y: number): Annotation | null => {
            const root = viewerRef.current;
            if (!root) return null;
            let bestId: string | null = null;
            let bestArea = Infinity;
            root.querySelectorAll<SVGGElement>('g.a9s-annotation').forEach((el) => {
              if (el.style.display === 'none') return;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || x < r.left || x > r.right || y < r.top || y > r.bottom) return;
              const area = r.width * r.height;
              if (area < bestArea) {
                bestArea = area;
                bestId = el.dataset.id ?? null;
              }
            });
            if (!bestId) return null;
            return (
              ((anno.getAnnotations?.() ?? []) as Annotation[]).find((a) => a.id === bestId) ?? null
            );
          };

          const notifyDelete = (a: Annotation) => {
            if (selectedDisplayIdRef.current === a.id) {
              selectedDisplayIdRef.current = null;
            }

            if (multiSelectedIdsRef.current.has(a.id)) {
              multiSelectedIdsRef.current.delete(a.id);
              emitSelectionIdsChange();
            }

            queueSyncAnnotationClasses();
            onDeleteRef.current?.(a);
            onSelectRef.current?.(null);
          };

          const addMultiSelectedId = (id: string) => {
            const next = new Set(multiSelectedIdsRef.current);

            if (next.has(id)) return;

            next.add(id);
            multiSelectedIdsRef.current = next;
            emitSelectionIdsChange();
          };

          const toggleMultiSelectedIdFromClick = (id: string) => {
            const next = new Set(multiSelectedIdsRef.current);

            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }

            multiSelectedIdsRef.current = next;
            multiSelectionHandledByClickIdRef.current = id;
            emitSelectionIdsChange();

            window.setTimeout(() => {
              if (multiSelectionHandledByClickIdRef.current === id) {
                multiSelectionHandledByClickIdRef.current = null;
              }
            }, 50);
          };

          const shouldAutoCommitDrawSelection = () =>
            allowMultipleSelectionRef.current &&
            autoCommitDrawSelectionsRef.current &&
            currentMode === 'draw';

          const reselectCurrentAnnotation = () => {
            const selected = anno.getSelected?.();
            if (!selected?.id) return;

            selectedDisplayIdRef.current = selected.id;
            anno.selectAnnotation(selected.id);
            queueSyncAnnotationClasses();
          };

          const commitDrawSelectionForContinuousDrawing = (selectionId: string) => {
            window.setTimeout(() => {
              if (!shouldAutoCommitDrawSelection()) return;

              const anno = annoRef.current;
              if (!anno) return;

              const selected = anno.getSelected?.();
              if (!selected) return;

              const draftAnnotation: Annotation = {
                ...selected,
                id: selectionId,
                type: 'Annotation',
                body: selected.body ?? [],
              };

              anno.updateSelected?.(draftAnnotation, true);
            }, 0);
          };

          anno.on('createSelection', (selection: Annotation) => {
            const selectionWithId = withDraftAnnotationId(selection);

            selectedDisplayIdRef.current = selectionWithId.id;
            anno.readOnly = false;
            queueSyncAnnotationClasses();
            onSelectRef.current?.(selectionWithId);

            if (shouldAutoCommitDrawSelection()) {
              commitDrawSelectionForContinuousDrawing(selectionWithId.id);
            }
          });

          anno.on('createAnnotation', (a: Annotation) => {
            selectedDisplayIdRef.current = a.id;
            anno.readOnly = false;

            if (shouldAutoCommitDrawSelection()) {
              addMultiSelectedId(a.id);
            }

            queueSyncAnnotationClasses();
            onCreateRef.current?.(a);
          });

          anno.on('updateAnnotation', (a: Annotation) => {
            selectedDisplayIdRef.current = a.id;
            queueSyncAnnotationClasses();

            if (currentMode === 'modify') {
              onUpdateRef.current?.(a);
            }
          });

          anno.on('changeSelectionTarget', (target: unknown) => {
            if (currentMode !== 'modify') return;

            const selected = anno.getSelected?.();
            if (!selected) return;

            onUpdateRef.current?.({
              ...selected,
              target,
            });
          });

          const getLastMultiSelectedAnnotation = (): Annotation | null => {
            const ids = Array.from(multiSelectedIdsRef.current);
            const lastId = ids.length > 0 ? ids[ids.length - 1] : null;
            if (!lastId) return null;

            return (anno.getAnnotationById?.(lastId) ?? null) as Annotation | null;
          };

          const finalizeAfterActiveDeselect = () => {
            const nextActive = getLastMultiSelectedAnnotation();
            selectedDisplayIdRef.current = nextActive?.id ?? null;
            anno.readOnly = nextActive ? isDraftAnnotation(nextActive) === false : true;
            queueSyncAnnotationClasses();
            onSelectRef.current?.(nextActive);
          };

          const clearSuppressedReselectLater = (annotationId: string) => {
            window.setTimeout(() => {
              if (suppressReselectIdRef.current === annotationId) {
                suppressReselectIdRef.current = null;
              }
            }, 0);
          };

          const toggleOffActiveAnnotation = (annotation: Annotation): boolean => {
            if (!allowMultipleSelectionRef.current) return false;
            if (currentMode !== 'pan') return false;
            if (selectedDisplayIdRef.current !== annotation.id) return false;
            if (!multiSelectedIdsRef.current.has(annotation.id)) return false;

            const nextSelectedIds = new Set(multiSelectedIdsRef.current);
            nextSelectedIds.delete(annotation.id);
            multiSelectedIdsRef.current = nextSelectedIds;
            emitSelectionIdsChange();

            suppressReselectIdRef.current = annotation.id;
            selectedDisplayIdRef.current = null;

            const result = anno.cancelSelected?.();

            if (result && typeof result === 'object' && 'then' in result) {
              void result.then(() => {
                finalizeAfterActiveDeselect();
                clearSuppressedReselectLater(annotation.id);
              });
            } else {
              finalizeAfterActiveDeselect();
              clearSuppressedReselectLater(annotation.id);
            }

            return true;
          };

          const deleteFromActiveAnnotation = (annotation: Annotation): boolean => {
            if (currentMode !== 'delete') return false;
            if (selectedDisplayIdRef.current !== annotation.id) return false;

            const selectedIds = Array.from(multiSelectedIdsRef.current);
            const shouldBatchDelete =
              allowMultipleSelectionRef.current &&
              selectedIds.length > 1 &&
              selectedIds.includes(annotation.id);

            if (shouldBatchDelete) {
              const annotationsToDelete = selectedIds
                .map((id) => anno.getAnnotationById?.(id) ?? null)
                .filter((item): item is Annotation => item !== null);

              if (!annotationsToDelete.length) return true;

              const confirmed = confirmDeleteManyRef.current?.(annotationsToDelete) ?? true;
              if (!confirmed) return true;

              selectedDisplayIdRef.current = null;
              multiSelectedIdsRef.current.clear();
              emitSelectionIdsChange();

              annotationsToDelete.forEach((item) => {
                anno.removeAnnotation(item);
              });

              queueSyncAnnotationClasses();

              annotationsToDelete.forEach((item) => {
                onDeleteRef.current?.(item, { bulk: true });
              });

              onDeleteManyRef.current?.(annotationsToDelete);
              onSelectRef.current?.(null);
              return true;
            }

            const confirmed = confirmDeleteRef.current?.(annotation) ?? true;
            if (!confirmed) return true;

            anno.removeAnnotation(annotation);
            notifyDelete(annotation);
            return true;
          };

          anno.on('clickAnnotation', (a: Annotation) => {
            // Ignore clicks on annotations hidden by the active filter (e.g. a
            // glyph beneath a region in text view).
            if (!isAnnotationVisible(a)) return;

            if (deleteFromActiveAnnotation(a)) {
              return;
            }

            if (toggleOffActiveAnnotation(a)) {
              return;
            }

            if (
              allowMultipleSelectionRef.current &&
              currentMode === 'pan' &&
              !isTextRegionAnnotation(a)
            ) {
              toggleMultiSelectedIdFromClick(a.id);
              queueSyncAnnotationClasses();
            }

            if (currentMode === 'pan') {
              anno.readOnly = isDraftAnnotation(a) ? false : true;
            } else if (currentMode === 'modify') {
              // Modify reshapes ANY annotation incl. a text-region: keep it
              // editable so the drag fires updateAnnotation → persistRegionGeometry.
              anno.readOnly = false;
            } else if (currentMode === 'draw') {
              anno.readOnly = false;
            }
          });

          anno.on('selectAnnotation', (a: Annotation | null) => {
            if (currentMode === 'delete') {
              return;
            }

            // Annotorious hit-tests its own store and ignores our display:none, so
            // a click on a region can resolve to a glyph hidden beneath it. Cancel
            // that selection and instead surface the VISIBLE annotation the user
            // actually clicked (e.g. the region), so the right thing is selected
            // and the hidden glyph's popup never opens.
            if (a && !isAnnotationVisible(a)) {
              selectedDisplayIdRef.current = null;
              anno.cancelSelected?.();
              const pt = lastPointerDownRef.current;
              const target = pt ? visibleAnnotationAtPoint(pt.x, pt.y) : null;
              selectedDisplayIdRef.current = target?.id ?? null;
              onSelectRef.current?.(target ?? null);
              return;
            }

            if (a && currentMode === 'pan' && suppressReselectIdRef.current === a.id) {
              suppressReselectIdRef.current = null;
              selectedDisplayIdRef.current = null;

              const result = anno.cancelSelected?.();

              if (result && typeof result === 'object' && 'then' in result) {
                void result.then(() => {
                  finalizeAfterActiveDeselect();
                });
              } else {
                finalizeAfterActiveDeselect();
              }

              return;
            }

            selectedDisplayIdRef.current = a?.id ?? null;

            if (
              allowMultipleSelectionRef.current &&
              currentMode === 'pan' &&
              a &&
              !isTextRegionAnnotation(a)
            ) {
              if (multiSelectionHandledByClickIdRef.current === a.id) {
                multiSelectionHandledByClickIdRef.current = null;
              } else {
                const next = new Set(multiSelectedIdsRef.current);

                if (next.has(a.id)) {
                  next.delete(a.id);
                } else {
                  next.add(a.id);
                }

                multiSelectedIdsRef.current = next;
                emitSelectionIdsChange();
              }
            }

            if (currentMode === 'draw') {
              anno.readOnly = false;
            } else if (currentMode === 'modify') {
              // Editable in modify so a text-region reshape persists (see above).
              anno.readOnly = false;
            } else if (currentMode === 'pan') {
              anno.readOnly = isDraftAnnotation(a) ? false : true;
            }

            queueSyncAnnotationClasses();
            onSelectRef.current?.(a);
          });

          anno.on('cancelSelected', () => {
            selectedDisplayIdRef.current = null;
            anno.readOnly = currentMode === 'draw' || currentMode === 'modify' ? false : true;
            queueSyncAnnotationClasses();
            onSelectRef.current?.(null);
          });

          exposeApiRef.current?.({
            zoomIn: () => {
              const v = osdRef.current;
              v?.viewport.zoomBy(1.2);
              v?.viewport.applyConstraints();
            },
            zoomOut: () => {
              const v = osdRef.current;
              v?.viewport.zoomBy(0.8);
              v?.viewport.applyConstraints();
            },
            goHome: () => osdRef.current?.viewport.goHome(),
            panByPixels: (x: number, y: number) => {
              const viewer = osdRef.current;
              const Point = osdModuleRef.current?.Point;
              if (!viewer || !Point) return;

              viewer.viewport.panBy(
                viewer.viewport.deltaPointsFromPixels(new Point(x, y), true),
                false
              );
              viewer.viewport.applyConstraints();
            },
            rotateBy: (degrees: number) => {
              const viewer = osdRef.current;
              if (!viewer) return;

              const currentRotation = viewer.viewport.getRotation();
              viewer.viewport.setRotation(normalizeRotation(currentRotation + degrees), true);
            },
            resetRotation: () => {
              osdRef.current?.viewport.setRotation(0, true);
            },
            setImageAdjustments: (adjustments: ViewerImageAdjustments) => {
              viewerRef.current?.style.setProperty(
                '--manuscript-image-filter',
                buildViewerImageFilter(adjustments)
              );
            },

            // --- MOVE TOOL ---
            enablePan: () => {
              const anno = annoRef.current;
              if (!anno) return;

              if (deleteHandler) {
                anno.off('selectAnnotation', deleteHandler);
                deleteHandler = null;
              }
              if (rearmHandler) {
                anno.off('createAnnotation', rearmHandler);
                anno.off('cancelSelected', rearmHandler);
                anno.off('updateAnnotation', rearmHandler);
                rearmHandler = null;
              }

              currentMode = 'pan';
              const selected = (anno.getSelected?.() as Annotation | undefined) ?? null;
              anno.readOnly = isDraftAnnotation(selected) ? false : true;
              anno.setDrawingEnabled(false);
              setOsdDragToPan(true);
              viewerRef.current?.classList.remove(
                'osd-mode-modify',
                'osd-mode-draw',
                'osd-mode-delete'
              );
              viewerRef.current?.classList.add('osd-mode-pan');
              reselectCurrentAnnotation();
            },

            // --- MODIFY TOOL ---
            enableModify: () => {
              const anno = annoRef.current;
              if (!anno) return;

              if (deleteHandler) {
                anno.off('selectAnnotation', deleteHandler);
                deleteHandler = null;
              }
              if (rearmHandler) {
                anno.off('createAnnotation', rearmHandler);
                anno.off('cancelSelected', rearmHandler);
                anno.off('updateAnnotation', rearmHandler);
                rearmHandler = null;
              }

              currentMode = 'modify';
              // Modify keeps every annotation (incl. a text-region) editable so a
              // reshape fires updateAnnotation → persistRegionGeometry.
              anno.readOnly = false;
              anno.setDrawingEnabled(false);
              setOsdDragToPan(true);
              viewerRef.current?.classList.remove(
                'osd-mode-pan',
                'osd-mode-draw',
                'osd-mode-delete'
              );
              viewerRef.current?.classList.add('osd-mode-modify');
              reselectCurrentAnnotation();
            },

            // --- DRAW TOOL ---
            enableDraw: () => {
              const anno = annoRef.current;
              if (!anno) return;

              if (deleteHandler) {
                anno.off('selectAnnotation', deleteHandler);
                deleteHandler = null;
              }

              anno.readOnly = false;
              anno.setDrawingEnabled(true);
              setOsdDragToPan(false);
              currentMode = 'draw';
              viewerRef.current?.classList.remove(
                'osd-mode-pan',
                'osd-mode-modify',
                'osd-mode-delete'
              );
              viewerRef.current?.classList.add('osd-mode-draw');

              const rearm = () => {
                if (currentMode === 'draw') {
                  setTimeout(() => {
                    anno.readOnly = false;
                    anno.setDrawingEnabled(true);
                  }, 0);
                }
              };

              if (rearmHandler) {
                anno.off('createAnnotation', rearmHandler);
                anno.off('cancelSelected', rearmHandler);
                anno.off('updateAnnotation', rearmHandler);
              }

              rearmHandler = rearm;
              anno.on('createAnnotation', rearmHandler);
              anno.on('cancelSelected', rearmHandler);
              anno.on('updateAnnotation', rearmHandler);
            },

            // --- DELETE TOOL ---
            enableDelete: () => {
              const anno = annoRef.current;
              if (!anno) return;

              if (rearmHandler) {
                anno.off('createAnnotation', rearmHandler);
                anno.off('cancelSelected', rearmHandler);
                anno.off('updateAnnotation', rearmHandler);
                rearmHandler = null;
              }

              anno.readOnly = true;
              anno.setDrawingEnabled(false);
              setOsdDragToPan(true);
              currentMode = 'delete';
              viewerRef.current?.classList.remove(
                'osd-mode-pan',
                'osd-mode-modify',
                'osd-mode-draw'
              );
              viewerRef.current?.classList.add('osd-mode-delete');

              if (deleteHandler) anno.off('selectAnnotation', deleteHandler);
              deleteHandler = (a) => {
                if (!a || currentMode !== 'delete') return;

                // Resolve a hidden hit (a glyph beneath a region) to the VISIBLE
                // annotation the user actually clicked, so Delete acts on the
                // region rather than the glyph hidden under it. (The main select
                // handler's recovery is skipped in delete mode, so do it here.)
                let target: Annotation | null = a;
                if (!isAnnotationVisible(target)) {
                  const pt = lastPointerDownRef.current;
                  target = pt ? visibleAnnotationAtPoint(pt.x, pt.y) : null;
                  if (!target) {
                    anno.cancelSelected?.();
                    return;
                  }
                }

                // Text-region: delete via unlink (removes graph + strips corresp),
                // NOT the glyph path. Annotorious re-fires selectAnnotation in a
                // loop while the region stays on canvas, so act exactly once per
                // physical click (pointer-down seq) — otherwise the confirm stacks
                // and deletes cascade.
                if (isTextRegionAnnotation(target)) {
                  if (lastHandledDeleteSeqRef.current === pointerDownSeqRef.current) return;
                  lastHandledDeleteSeqRef.current = pointerDownSeqRef.current;
                  selectedDisplayIdRef.current = null;
                  anno.cancelSelected?.();
                  onDeleteTextRegionRef.current?.(target);
                  return;
                }

                const selectedIds = Array.from(multiSelectedIdsRef.current);
                const shouldBatchDelete =
                  allowMultipleSelectionRef.current &&
                  selectedIds.length > 1 &&
                  selectedIds.includes(target.id);

                if (shouldBatchDelete) {
                  const annotationsToDelete = selectedIds
                    .map((id) => anno.getAnnotationById?.(id) ?? null)
                    .filter((item): item is Annotation => item !== null);

                  if (!annotationsToDelete.length) return;

                  const confirmed = confirmDeleteManyRef.current?.(annotationsToDelete) ?? true;
                  if (!confirmed) return;

                  selectedDisplayIdRef.current = null;
                  multiSelectedIdsRef.current.clear();
                  emitSelectionIdsChange();

                  annotationsToDelete.forEach((annotation) => {
                    anno.removeAnnotation(annotation);
                  });

                  queueSyncAnnotationClasses();

                  annotationsToDelete.forEach((annotation) => {
                    onDeleteRef.current?.(annotation, { bulk: true });
                  });

                  onDeleteManyRef.current?.(annotationsToDelete);
                  onSelectRef.current?.(null);
                  return;
                }

                const confirmed = confirmDeleteRef.current?.(target) ?? true;
                if (!confirmed) return;

                anno.removeAnnotation(target);
                notifyDelete(target);
              };
              anno.on('selectAnnotation', deleteHandler);
            },

            // --- SHOW/HIDE ANNOTATIONS ---
            toggleAnnotations: (visible: boolean) => {
              const anno = annoRef.current;
              if (!anno) return;

              anno.setVisible(visible);

              if (!visible) {
                selectedDisplayIdRef.current = null;
                multiSelectedIdsRef.current.clear();
                emitSelectionIdsChange();
                anno.readOnly = true;
                queueSyncAnnotationClasses();
                onSelectRef.current?.(null);
                anno.setDrawingEnabled(false);

                if (deleteHandler) {
                  anno.off('selectAnnotation', deleteHandler);
                  deleteHandler = null;
                }

                currentMode = 'pan';
              }
            },

            highlightAnnotations: (ids: string[]) => {
              const root = viewerRef.current;
              if (!root) return;

              // Remove highlight from all first
              root
                .querySelectorAll<SVGGElement>('g.a9s-annotation.a9s-highlight')
                .forEach((el) => el.classList.remove('a9s-highlight'));

              // Add highlight to requested ids
              ids.forEach((id) => {
                const el = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${id}"]`);
                if (el) el.classList.add('a9s-highlight');
              });
            },

            clearHighlights: () => {
              const root = viewerRef.current;
              if (!root) return;
              root
                .querySelectorAll<SVGGElement>('g.a9s-annotation.a9s-highlight')
                .forEach((el) => el.classList.remove('a9s-highlight'));
            },

            getAnnotations: () => annoRef.current?.getAnnotations?.() ?? [],

            getSelectedAnnotationIds: () => Array.from(multiSelectedIdsRef.current),

            clearSelectedAnnotationIds: () => {
              multiSelectedIdsRef.current.clear();
              emitSelectionIdsChange();
              queueSyncAnnotationClasses();
            },

            centerOnAnnotation: (id: string) => {
              annoRef.current?.fitBounds?.(id, {
                immediately: true,
                padding: 600,
              });
            },

            clearSelection: () => {
              selectedDisplayIdRef.current = null;

              const result = annoRef.current?.cancelSelected?.();

              if (result && typeof result === 'object' && 'then' in result) {
                void result.then(() => {
                  if (annoRef.current) {
                    annoRef.current.readOnly =
                      currentMode === 'draw' || currentMode === 'modify' ? false : true;
                  }
                  queueSyncAnnotationClasses();
                });
              } else {
                if (annoRef.current) {
                  annoRef.current.readOnly =
                    currentMode === 'draw' || currentMode === 'modify' ? false : true;
                }
                queueSyncAnnotationClasses();
              }
            },

            selectAnnotationById: (id: string) => {
              const selected = annoRef.current?.getAnnotationById?.(id) ?? null;

              if (annoRef.current) {
                if (currentMode === 'draw') {
                  annoRef.current.readOnly = false;
                } else if (currentMode === 'modify') {
                  // Editable in modify so a text-region reshape persists.
                  annoRef.current.readOnly = false;
                } else if (currentMode === 'pan') {
                  annoRef.current.readOnly = isDraftAnnotation(selected) ? false : true;
                }
              }

              selectedDisplayIdRef.current = id;

              if (
                allowMultipleSelectionRef.current &&
                selected &&
                !isTextRegionAnnotation(selected)
              ) {
                const next = new Set(multiSelectedIdsRef.current);
                next.add(id);
                multiSelectedIdsRef.current = next;
                emitSelectionIdsChange();
              }

              annoRef.current?.selectAnnotation(id);
              queueSyncAnnotationClasses();
            },

            removeAnnotationById: (id: string) => {
              const anno = annoRef.current;
              if (!anno) return;

              const annotation = anno.getAnnotationById?.(id) ?? null;
              if (!annotation) return;

              if (selectedDisplayIdRef.current === id) {
                selectedDisplayIdRef.current = null;
              }

              if (multiSelectedIdsRef.current.has(id)) {
                multiSelectedIdsRef.current.delete(id);
                emitSelectionIdsChange();
              }

              anno.removeAnnotation(annotation);
              queueSyncAnnotationClasses();
            },

            updateSelectedDraft: async (annotation: Annotation) => {
              const anno = annoRef.current;
              if (!anno) return;

              const selected = anno.getSelected?.();
              const selectedId = selected?.id;
              const existing = anno.getAnnotationById?.(annotation.id);

              if (selected && (!selectedId || selectedId === annotation.id)) {
                const result = anno.updateSelected?.(annotation);
                if (result && typeof result === 'object' && 'then' in result) {
                  await result;
                } else {
                  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
                }
              } else if (existing) {
                anno.addAnnotation(annotation);
              }

              selectedDisplayIdRef.current = annotation.id;
              queueSyncAnnotationClasses();
            },

            saveSelectedDraft: async () => {
              const anno = annoRef.current;
              if (!anno) return;

              const result = anno.saveSelected?.();
              if (result && typeof result === 'object' && 'then' in result) {
                await result;
              }

              queueSyncAnnotationClasses();
            },
          });
        }
      });
    })();

    return () => {
      isMounted = false;
      const prev = annoRef.current;
      annoRef.current = null;
      try {
        (prev as { destroy?: () => void })?.destroy?.();
      } catch {
        // ignore
      }
      const v = osdRef.current;
      osdRef.current = null;
      try {
        v?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [iiifImageUrl, emitSelectionIdsChange, queueSyncAnnotationClasses, disableEditor, readOnly]);

  // Restrict scroll-to-zoom to the pinch gesture. Browsers fire `wheel` with
  // ctrlKey=true for a trackpad pinch (and for Ctrl/⌘+wheel); a plain two-finger
  // scroll or mouse wheel has ctrlKey=false. OpenSeadragon binds its wheel
  // handler in the bubble phase on an inner canvas, so a capture-phase listener
  // on the outer element runs first: for a plain scroll we stopPropagation so
  // OSD never zooms and — since we never preventDefault — the event still drives
  // the page's normal scroll; a pinch passes through untouched to OSD's zoom.
  useEffect(() => {
    const root = viewerRef.current;
    if (!root) return;

    const onWheelCapture = (event: WheelEvent) => {
      if (event.ctrlKey) return; // pinch / ctrl+wheel → let OpenSeadragon zoom
      event.stopPropagation(); // plain scroll → keep it from OSD; page scrolls
    };

    root.addEventListener('wheel', onWheelCapture, { capture: true, passive: true });
    return () => root.removeEventListener('wheel', onWheelCapture, { capture: true });
  }, []);

  useEffect(() => {
    const anno = annoRef.current;
    if (!anno || !Array.isArray(initialAnnotations)) return;

    anno.setAnnotations(initialAnnotations);
    queueSyncAnnotationClasses();
  }, [initialAnnotations, iiifImageUrl, queueSyncAnnotationClasses]);

  if (state.hasError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--viewer-canvas)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: 'var(--primary-foreground)',
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '600px',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 'bold' }}>
            Image Load Error
          </h3>
          <p style={{ marginBottom: '1rem', opacity: 0.9 }}>{state.errorMessage}</p>
          <button
            onClick={() => {
              setState({ hasError: false, errorMessage: null, isLoading: true });
              // Trigger a re-render by updating the key or reloading
              window.location.reload();
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Fill the flex-allocated canvas area (100%), NOT the full viewport. Using
  // 100vw here let OpenSeadragon size its canvas to the whole window, so when a
  // text panel docks left/right the image stayed centred in that phantom full
  // width and zoom anchored behind the panel (drifting the image away).
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {state.isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--primary-foreground)',
            zIndex: 10,
          }}
        >
          Loading image...
        </div>
      )}
      <div
        ref={viewerRef}
        className="manuscript-osd-viewer"
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--viewer-canvas)',
          position: 'relative',
        }}
      />
    </div>
  );
}
