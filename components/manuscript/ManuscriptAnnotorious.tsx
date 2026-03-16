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
    graphcomponentSet?: Array<{ component: number; features: number[] }>;
  };
}
type AnnotoriousFactory = typeof import('@recogito/annotorious-openseadragon').default;
type AnnotoriousInstance = ReturnType<AnnotoriousFactory>;

// ---- API we expose upward (no ref needed) ----
export type ViewerApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  goHome: () => void;
  enablePan: () => void;
  enableDraw: () => void;
  enableDelete: () => void;
  toggleAnnotations: (visible: boolean) => void;
  getAnnotations: () => Annotation[];
  centerOnAnnotation?: (id: string) => void;
  highlightAnnotations: (ids: string[]) => void;
  clearHighlights: () => void;
  clearSelection: () => void;
  selectAnnotationById?: (id: string) => void;
  updateSelectedDraft?: (annotation: Annotation) => Promise<void>;
  saveSelectedDraft?: () => Promise<void>;
};

// ---- Component props ----
interface Props {
  iiifImageUrl: string;
  onCreate?: (annotation: Annotation) => void;
  onDelete?: (annotation: Annotation) => void;
  onSelect?: (annotation: Annotation | null) => void;
  exposeApi?: (api: ViewerApi) => void;
  initialAnnotations?: Annotation[];
  disableEditor?: boolean;
  readOnly?: boolean;
  annotationFilter?: (annotation: Annotation) => boolean;
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
  onDelete,
  onSelect,
  exposeApi,
  initialAnnotations = [],
  disableEditor = false,
  readOnly = false,
  annotationFilter,
}: Props) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const osdRef = useRef<OpenSeadragon.Viewer | null>(null);
  const annoRef = useRef<AnnotoriousInstance | null>(null);
  const osdModuleRef = useRef<{
    Rect: new (x: number, y: number, w: number, h: number) => unknown;
  } | null>(null);
  const onCreateRef = useRef(onCreate);
  const onDeleteRef = useRef(onDelete);
  const onSelectRef = useRef(onSelect);
  const exposeApiRef = useRef(exposeApi);
  const annotationFilterRef = useRef<Props['annotationFilter']>(annotationFilter);
  const [state, setState] = React.useState<ComponentState>({
    hasError: false,
    errorMessage: null,
    isLoading: true,
  });

  const selectedDisplayIdRef = useRef<string | null>(null);
  const isDraftAnnotation = (a: Annotation | null | undefined) =>
    Boolean(a && typeof a.id === 'string' && !a.id.startsWith('db:'));

  const syncAnnotationClasses = React.useCallback(() => {
    const root = viewerRef.current;
    const anno = annoRef.current;
    if (!root || !anno) return;

    root.querySelectorAll<SVGGElement>('g.a9s-annotation').forEach((el) => {
      el.classList.remove('a9s-described', 'a9s-undescribed', 'a9s-current-selected');
    });

    root.querySelectorAll<SVGGElement>('g.a9s-selection').forEach((el) => {
      el.classList.remove('a9s-described', 'a9s-undescribed');
    });

    const annotations = (anno.getAnnotations?.() ?? []) as Annotation[];

    annotations.forEach((a) => {
      const el = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${a.id}"]`);
      if (!el) return;

      const isDescribed = a._meta?.isDescribed === true;
      el.classList.add(isDescribed ? 'a9s-described' : 'a9s-undescribed');
    });

    const selectedId = anno.getSelected?.()?.id ?? selectedDisplayIdRef.current;
    if (selectedId) {
      const baseEl = root.querySelector<SVGGElement>(`g.a9s-annotation[data-id="${selectedId}"]`);
      if (baseEl) {
        baseEl.classList.add('a9s-current-selected');
      }
    }
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

    const selectedId = anno.getSelected?.()?.id ?? selectedDisplayIdRef.current;

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
    onDeleteRef.current = onDelete;
  }, [onDelete]);
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
          // OpenSeadragon supports IIIF Image API 2.x; Sipi often returns 3.0. Rewrite id and, if needed, convert to 2-style.
          const id = baseUrl;
          if (obj.type === 'ImageService3') {
            tileSources = {
              '@context': 'http://iiif.io/api/image/2/context.json',
              '@id': id,
              protocol: obj.protocol ?? 'http://iiif.io/api/image',
              width: obj.width,
              height: obj.height,
              profile: Array.isArray(obj.profile) ? obj.profile : [obj.profile],
              tiles: obj.tiles ?? [{ scaleFactors: [1, 2, 4, 8, 16], width: 256 }],
            };
          } else {
            tileSources = { ...obj, id: baseUrl, '@id': baseUrl };
          }
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

          anno.on('createSelection', (selection: Annotation) => {
            selectedDisplayIdRef.current = selection.id;
            anno.readOnly = false;
            queueSyncAnnotationClasses();
            onSelectRef.current?.(selection);
          });

          anno.on('createAnnotation', (a: Annotation) => {
            selectedDisplayIdRef.current = a.id;
            anno.readOnly = false;
            queueSyncAnnotationClasses();
            onCreateRef.current?.(a);
          });

          anno.on('deleteAnnotation', (a: Annotation) => {
            if (selectedDisplayIdRef.current === a.id) {
              selectedDisplayIdRef.current = null;
            }
            queueSyncAnnotationClasses();
            onDeleteRef.current?.(a);
          });

          anno.on('clickAnnotation', (a: Annotation) => {
            if (currentMode === 'pan') {
              anno.readOnly = isDraftAnnotation(a) ? false : true;
            } else if (currentMode === 'draw') {
              anno.readOnly = false;
            }
          });

          anno.on('selectAnnotation', (a: Annotation | null) => {
            if (currentMode === 'delete') {
              return;
            }

            selectedDisplayIdRef.current = a?.id ?? null;

            if (currentMode === 'draw') {
              anno.readOnly = false;
            } else if (currentMode === 'pan') {
              anno.readOnly = isDraftAnnotation(a) ? false : true;
            }

            queueSyncAnnotationClasses();
            onSelectRef.current?.(a);
          });

          anno.on('cancelSelected', () => {
            selectedDisplayIdRef.current = null;
            anno.readOnly = currentMode === 'draw' ? false : true;
            queueSyncAnnotationClasses();
            onSelectRef.current?.(null);
          });

          let currentMode: 'pan' | 'draw' | 'delete' = 'pan';
          let deleteHandler: ((a: Annotation | null, element?: unknown) => void) | null = null;
          let rearmHandler: (() => void) | null = null;

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
              viewerRef.current?.classList.remove('osd-mode-draw', 'osd-mode-delete');
              viewerRef.current?.classList.add('osd-mode-pan');
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
              currentMode = 'draw';
              viewerRef.current?.classList.remove('osd-mode-pan', 'osd-mode-delete');
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
              currentMode = 'delete';
              viewerRef.current?.classList.remove('osd-mode-pan', 'osd-mode-draw');
              viewerRef.current?.classList.add('osd-mode-delete');

              if (deleteHandler) anno.off('selectAnnotation', deleteHandler);
              deleteHandler = (a) => {
                if (a && currentMode === 'delete') {
                  anno.removeAnnotation(a);
                }
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
                    annoRef.current.readOnly = currentMode === 'draw' ? false : true;
                  }
                  queueSyncAnnotationClasses();
                });
              } else {
                if (annoRef.current) {
                  annoRef.current.readOnly = currentMode === 'draw' ? false : true;
                }
                queueSyncAnnotationClasses();
              }
            },

            selectAnnotationById: (id: string) => {
              const selected = annoRef.current?.getAnnotationById?.(id) ?? null;

              if (annoRef.current) {
                if (currentMode === 'draw') {
                  annoRef.current.readOnly = false;
                } else if (currentMode === 'pan') {
                  annoRef.current.readOnly = isDraftAnnotation(selected) ? false : true;
                }
              }

              selectedDisplayIdRef.current = id;
              annoRef.current?.selectAnnotation(id);
              queueSyncAnnotationClasses();
            },

            updateSelectedDraft: async (annotation: Annotation) => {
              const anno = annoRef.current;
              if (!anno) return;

              const result = anno.updateSelected?.(annotation);
              if (result && typeof result === 'object' && 'then' in result) {
                await result;
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
  }, [iiifImageUrl, queueSyncAnnotationClasses, disableEditor, readOnly]);

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
          background: '#000',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#fff', textAlign: 'center', padding: '2rem', maxWidth: '600px' }}>
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
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {state.isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            zIndex: 10,
          }}
        >
          Loading image...
        </div>
      )}
      <div
        ref={viewerRef}
        style={{ width: '100%', height: '100%', background: '#000', position: 'relative' }}
      />
    </div>
  );
}
