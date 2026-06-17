'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/auth-context';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import {
  updateViewerAnnotation,
  type BackendGraph,
  type BackendGraphComponent,
} from '@/services/annotations';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { sortHandsByPriority } from '@/lib/hand-ordering';
import type { Allograph, Component, Feature } from '@/types/allographs';
import type { HandType } from '@/types/hands';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { SearchableOption } from '@/lib/searchable-option-ranking';
import { cn } from '@/lib/utils';

// Tri-state model: every toggleable thing (feature, position) is 'all' (set
// on every selected graph), 'none' (set on none), or 'mixed' (some have it).
// Cycle is mixed → all → none → mixed. Only all/none commit on save; mixed
// means "leave each graph alone." In single-graph mode mixed is unreachable.

type TriState = 'all' | 'none' | 'mixed';
const MIXED = 'mixed' as const;

function deriveTriState(graphs: BackendGraph[], hasIt: (g: BackendGraph) => boolean): TriState {
  let trueCount = 0;
  for (const g of graphs) if (hasIt(g)) trueCount += 1;
  if (trueCount === 0) return 'none';
  if (trueCount === graphs.length) return 'all';
  return 'mixed';
}

// `consensus(items, get)` returns the unique value of `get(item)` across the
// set, or the MIXED sentinel when items disagree. Unifies the prior pair of
// allograph-/hand-specific helpers that used two different sentinels (null vs
// 'mixed') for the same concept.
type Consensus<T> = T | typeof MIXED;
function consensus<T>(items: BackendGraph[], get: (g: BackendGraph) => T): Consensus<T> {
  const first = get(items[0]);
  for (let i = 1; i < items.length; i += 1) {
    if (!Object.is(get(items[i]), first)) return MIXED;
  }
  return first;
}

function findComponent(graph: BackendGraph, componentId: number) {
  return (graph.graphcomponent_set ?? []).find((c) => c.component === componentId);
}
function graphHasFeature(graph: BackendGraph, componentId: number, featureId: number) {
  return findComponent(graph, componentId)?.features.includes(featureId) ?? false;
}
function graphHasPosition(graph: BackendGraph, positionId: number) {
  return (graph.positions ?? []).includes(positionId);
}

// All components the allograph defines are editable (G3.3) — including ones
// not yet present on every selected graph, so an editor can bulk-*add* a
// component. `sharedComponentIds` flags which are already on every graph so the
// UI can mark the rest as "not on all selected".
function sharedComponentIds(graphs: BackendGraph[], allograph: Allograph): Set<number> {
  const shared = new Set<number>();
  for (const c of allograph.components) {
    if (graphs.every((g) => Boolean(findComponent(g, c.component_id)))) shared.add(c.component_id);
  }
  return shared;
}

// Single hook used by both the features and positions sections: a pending
// per-key tri-state map that shadows a baseline derived from the graphs.
interface TriStateMap<K extends string | number> {
  get: (key: K) => TriState;
  set: (key: K, state: TriState) => void;
  hasMeaningfulEdits: boolean;
  reset: () => void;
  edits: Partial<Record<K, TriState>>;
}

function useTriStateMap<K extends string | number>(baseline: (key: K) => TriState): TriStateMap<K> {
  const [edits, setEdits] = React.useState<Partial<Record<K, TriState>>>({});
  return {
    edits,
    get: (key) => edits[key] ?? baseline(key),
    set: (key, state) => setEdits((prev) => ({ ...prev, [key]: state })),
    reset: () => setEdits({}),
    hasMeaningfulEdits: Object.values(edits).some((s) => s !== MIXED),
  };
}

const FEATURE_KEY_SEP = ':' as const;
const featureKey = (componentId: number, featureId: number) =>
  `${componentId}${FEATURE_KEY_SEP}${featureId}`;

function applyFeatureEdits(
  current: BackendGraphComponent[],
  edits: Partial<Record<string, TriState>>
): BackendGraphComponent[] {
  // Deep-ish clone: we mutate the features array in place per component.
  const next: BackendGraphComponent[] = current.map((c) => ({ ...c, features: [...c.features] }));

  for (const [key, state] of Object.entries(edits)) {
    if (!state || state === MIXED) continue;
    const [componentIdRaw, featureIdRaw] = key.split(FEATURE_KEY_SEP);
    const componentId = Number(componentIdRaw);
    const featureId = Number(featureIdRaw);

    let entry = next.find((c) => c.component === componentId);
    if (state === 'all') {
      if (!entry) {
        entry = { component: componentId, features: [] };
        next.push(entry);
      }
      if (!entry.features.includes(featureId)) entry.features.push(featureId);
    } else if (entry) {
      entry.features = entry.features.filter((f) => f !== featureId);
    }
  }

  // Drop component rows that ended up with no features so we don't persist
  // dangling components.
  return next.filter((c) => c.features.length > 0);
}

function applyPositionEdits(current: number[], edits: Partial<Record<number, TriState>>): number[] {
  const set = new Set(current);
  for (const [posIdRaw, state] of Object.entries(edits)) {
    if (!state || state === MIXED) continue;
    if (state === 'all') set.add(Number(posIdRaw));
    else set.delete(Number(posIdRaw));
  }
  return Array.from(set).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export interface AnnotationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphs: BackendGraph[];
  allographs: Allograph[];
  hands: HandType[];
  /** IIIF info URL for the parent image, used to render a crop preview of the
   *  graph(s) under edit. */
  iiifImage?: string;
  /** Called for every successful per-graph PATCH so the parent can apply an
   *  optimistic override immediately. */
  onGraphSaved?: (graph: BackendGraph) => void;
  /** Called once the dialog finishes its save batch (success or partial). */
  onComplete?: (result: { savedCount: number; failedCount: number }) => void;
}

// The body is a separate component so the hooks below can rely on the
// invariant that `graphs[0]` exists. The wrapper handles the empty-selection
// short-circuit before any hook call.
export function AnnotationEditDialog(props: AnnotationEditDialogProps) {
  if (!props.open || props.graphs.length === 0) return null;
  return <DialogBody {...props} />;
}

function DialogBody({
  open,
  onOpenChange,
  graphs,
  allographs,
  hands,
  iiifImage,
  onGraphSaved,
  onComplete,
}: AnnotationEditDialogProps) {
  const { token } = useAuth();
  const isMulti = graphs.length > 1;

  const allographOptions = React.useMemo<SearchableOption[]>(
    () =>
      allographs
        .map((a) => ({ value: String(a.id), label: formatAllographLabel(a) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [allographs]
  );
  const handOptions = React.useMemo<SearchableOption[]>(
    () => sortHandsByPriority(hands).map((h) => ({ value: String(h.id), label: h.name })),
    [hands]
  );

  // ---- Initial values from the selection ----------------------------------
  // Allograph: 'mixed' means the user must pick one before component/position
  // editing makes sense. Hand: 'mixed' means "leave each graph's hand alone."
  const initialAllograph = React.useMemo(() => consensus(graphs, (g) => g.allograph), [graphs]);
  const initialHand = React.useMemo(() => consensus(graphs, (g) => g.hand ?? null), [graphs]);

  // ---- Editable state -----------------------------------------------------
  const [allographId, setAllographId] = React.useState<number | null>(
    initialAllograph === MIXED ? null : initialAllograph
  );
  const [hand, setHand] = React.useState<Consensus<number | null>>(initialHand);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Ids that failed in the last save attempt, so the user can retry only those
  // instead of re-PATCHing the whole batch (G3.2).
  const [failedIds, setFailedIds] = React.useState<number[]>([]);

  // Reset draft state whenever the selection (and therefore the initial
  // values) changes — otherwise switching selection mid-dialog leaves stale
  // tri-state values. This is the React-docs "adjust state when a prop
  // changes" pattern: set state during render, guarded by a previous-value
  // tracker, so React re-renders immediately without a wasted commit+effect
  // pass. Fires on the same value-change trigger the prior effect keyed on
  // ([initialAllograph, initialHand]).
  const [prevInitials, setPrevInitials] = React.useState<{
    allograph: Consensus<number | null>;
    hand: Consensus<number | null>;
  }>({ allograph: initialAllograph, hand: initialHand });
  if (
    !Object.is(prevInitials.allograph, initialAllograph) ||
    !Object.is(prevInitials.hand, initialHand)
  ) {
    setPrevInitials({ allograph: initialAllograph, hand: initialHand });
    setAllographId(initialAllograph === MIXED ? null : initialAllograph);
    setHand(initialHand);
    setError(null);
  }

  const selectedAllograph = React.useMemo(
    () => allographs.find((a) => a.id === allographId) ?? null,
    [allographs, allographId]
  );

  // The schema source for editable components/positions. In multi-mode we
  // only have one when every selected graph already agrees on its allograph
  // — otherwise we hide those sections and prompt the user to pick one.
  const schemaAllograph: Allograph | null =
    isMulti && initialAllograph === MIXED ? null : selectedAllograph;

  const components = React.useMemo<Component[]>(
    () => schemaAllograph?.components ?? [],
    [schemaAllograph]
  );
  const sharedIds = React.useMemo(
    () => (schemaAllograph ? sharedComponentIds(graphs, schemaAllograph) : new Set<number>()),
    [graphs, schemaAllograph]
  );

  // ---- Tri-state maps for features and positions --------------------------
  const featureMap = useTriStateMap<string>(
    React.useCallback(
      (key) => {
        const [c, f] = key.split(FEATURE_KEY_SEP).map(Number);
        return deriveTriState(graphs, (g) => graphHasFeature(g, c, f));
      },
      [graphs]
    )
  );
  const positionMap = useTriStateMap<number>(
    React.useCallback((id) => deriveTriState(graphs, (g) => graphHasPosition(g, id)), [graphs])
  );

  // True when at least one editable surface has a value diverging from the
  // initial selection — drives Save-button enabled state and Save-button copy.
  const hasPendingChanges =
    (allographId != null &&
      allographId !== (initialAllograph === MIXED ? null : initialAllograph)) ||
    (hand !== MIXED && !Object.is(hand, initialHand)) ||
    featureMap.hasMeaningfulEdits ||
    positionMap.hasMeaningfulEdits;

  // Reset per-feature/per-position pending edits when the selection changes,
  // for the same reason the initial-value reset runs above. Same store-during-
  // render pattern, keyed on `graphs` identity (the prior effect's sole dep),
  // so a new selection clears pending edits before the next paint.
  const [prevGraphs, setPrevGraphs] = React.useState(graphs);
  if (!Object.is(prevGraphs, graphs)) {
    setPrevGraphs(graphs);
    featureMap.reset();
    positionMap.reset();
    setFailedIds([]);
  }

  // Guard every close path (Cancel, Escape, overlay click) against discarding
  // unsaved edits. The Sheet's `open` is controlled by the parent, so simply
  // not calling `onOpenChange(false)` keeps it open when the user backs out.
  const requestClose = React.useCallback(() => {
    if (
      hasPendingChanges &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved changes?')
    ) {
      return;
    }
    onOpenChange(false);
  }, [hasPendingChanges, onOpenChange]);

  // ---- Save ---------------------------------------------------------------

  function buildPatchForGraph(graph: BackendGraph) {
    const patch: {
      allograph?: number;
      hand?: number | null;
      graphcomponent_set?: BackendGraphComponent[];
      positions?: number[];
    } = {};

    if (allographId != null && allographId !== graph.allograph) {
      patch.allograph = allographId;
    }
    if (hand !== MIXED && hand !== (graph.hand ?? null)) {
      patch.hand = hand;
    }
    if (featureMap.hasMeaningfulEdits) {
      patch.graphcomponent_set = applyFeatureEdits(
        graph.graphcomponent_set ?? [],
        featureMap.edits
      );
    }
    if (positionMap.hasMeaningfulEdits) {
      patch.positions = applyPositionEdits(graph.positions ?? [], positionMap.edits);
    }
    return patch;
  }

  const runSave = async (targets: BackendGraph[]) => {
    if (!token) {
      setError('Not authenticated.');
      return;
    }
    setSaving(true);
    setError(null);

    let savedCount = 0;
    const failed: number[] = [];

    await Promise.all(
      targets.map(async (graph) => {
        const patch = buildPatchForGraph(graph);
        if (Object.keys(patch).length === 0) {
          // Nothing to do for this graph (e.g. multi-mode where only 'mixed'
          // states stayed mixed) — count as success and skip the round trip.
          savedCount += 1;
          return;
        }
        try {
          const updated = await updateViewerAnnotation(token, graph.id, patch);
          onGraphSaved?.(updated);
          savedCount += 1;
        } catch {
          failed.push(graph.id);
        }
      })
    );

    setSaving(false);
    setFailedIds(failed);
    onComplete?.({ savedCount, failedCount: failed.length });

    if (failed.length > 0) {
      // Keep the dialog open and surface the inline notice; also toast so the
      // user sees the failure if the dialog is scrolled past it.
      setError(`${failed.length} of ${targets.length} failed to save.`);
      toast.error(`${failed.length} of ${targets.length} graphs failed to save`);
    } else {
      toast.success(savedCount > 1 ? `Saved ${savedCount} graphs` : 'Saved');
      onOpenChange(false);
    }
  };

  const handleSave = () => runSave(graphs);
  const handleRetryFailed = () => {
    const failedSet = new Set(failedIds);
    runSave(graphs.filter((g) => failedSet.has(g.id)));
  };

  // ⌘/Ctrl+Enter to save without reaching for the mouse. Skips when there's
  // nothing to commit or a save is already in flight.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (saving || !hasPendingChanges) return;
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // handleSave closes over state at this render — using a stale closure
    // would replay stale edits, so we depend only on the gating flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, hasPendingChanges]);

  // ---- Render -------------------------------------------------------------

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else requestClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl"
        // Don't auto-focus the first input on open — the SearchableSelect
        // popovers can interact badly with focus capture inside the sheet.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="text-xl">
            {isMulti ? `Edit ${graphs.length} graphs` : `Edit graph #${graphs[0].id}`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {iiifImage && <GraphPreviewStrip graphs={graphs} iiifImage={iiifImage} />}
          {isMulti && initialAllograph === MIXED && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              Selected graphs use different allographs. Choose one to set on all of them, or close
              and refine the selection.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Allograph</Label>
              <SearchableSelect
                options={allographOptions}
                value={allographId != null ? String(allographId) : null}
                onValueChange={(v) => setAllographId(v ? Number(v) : null)}
                placeholder={
                  isMulti && initialAllograph === MIXED ? 'Mixed — pick one' : 'Allograph'
                }
                searchPlaceholder="Search allographs…"
                emptyText="No allographs"
                triggerClassName="h-9 w-full text-sm"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Hand</Label>
              <SearchableSelect
                options={handOptions}
                value={hand === MIXED || hand == null ? null : String(hand)}
                onValueChange={(v) => setHand(v ? Number(v) : null)}
                placeholder={hand === MIXED ? 'Mixed — pick one' : 'Hand'}
                searchPlaceholder="Search hands…"
                emptyText="No hands"
                clearLabel="No hand"
                triggerClassName="h-9 w-full text-sm"
              />
            </div>
          </div>

          {schemaAllograph ? (
            <>
              {isMulti && (
                <p className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
                  Each row has three options: <span className="font-medium">All</span> applies to
                  every selected graph, <span className="font-medium">None</span> removes from every
                  selected graph, and <span className="font-medium">Mixed</span> leaves each
                  graph&apos;s current value alone on save.
                </p>
              )}

              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Components &amp; features
                  {isMulti && (
                    <span className="ml-2 font-normal text-muted-foreground/80">
                      (set All to add a component to every selected graph)
                    </span>
                  )}
                </h3>
                {components.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This allograph has no defined components.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {components.map((c) => (
                      <ComponentBlock
                        key={c.component_id}
                        component={c}
                        isMulti={isMulti}
                        notOnAll={isMulti && !sharedIds.has(c.component_id)}
                        getFeatureState={(fId) => featureMap.get(featureKey(c.component_id, fId))}
                        onSetFeatureState={(fId, s) =>
                          featureMap.set(featureKey(c.component_id, fId), s)
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Positions</h3>
                {schemaAllograph.positions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This allograph has no defined positions.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {schemaAllograph.positions.map((p) => (
                      <TriRow
                        key={p.id}
                        label={p.name}
                        isMulti={isMulti}
                        state={positionMap.get(p.id)}
                        onSet={(s) => positionMap.set(p.id, s)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pick an allograph to edit its components and positions.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          {failedIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryFailed}
              disabled={saving}
              className="gap-2 text-destructive"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Retry failed ({failedIds.length})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasPendingChanges}
            title="⌘/Ctrl+Enter to save"
            className="gap-2"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isMulti ? `Save ${graphs.length} graphs` : 'Save'}
            <kbd className="ml-1 hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 text-[10px] font-medium sm:inline">
              ⌘↵
            </kbd>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

// A small crop preview of the graph(s) under edit, so the editor can see what
// they're changing instead of trusting that they clicked the right thumb.
const PREVIEW_LIMIT = 8;

function GraphPreviewStrip({ graphs, iiifImage }: { graphs: BackendGraph[]; iiifImage: string }) {
  const shown = graphs.slice(0, PREVIEW_LIMIT);
  const overflow = graphs.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
      {shown.map((g) => (
        <GraphPreviewThumb key={g.id} graph={g} iiifImage={iiifImage} />
      ))}
      {overflow > 0 && (
        <span className="flex h-16 w-16 items-center justify-center rounded border bg-background text-xs font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function GraphPreviewThumb({ graph, iiifImage }: { graph: BackendGraph; iiifImage: string }) {
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnailUrl(iiifImage, annotationJson, 200);
  return (
    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-background">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={`Graph ${graph.id}`}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      ) : (
        <span className="text-xs text-muted-foreground">…</span>
      )}
    </span>
  );
}

interface ComponentBlockProps {
  component: Component;
  isMulti: boolean;
  notOnAll?: boolean;
  getFeatureState: (featureId: number) => TriState;
  onSetFeatureState: (featureId: number, state: TriState) => void;
}

function ComponentBlock({
  component,
  isMulti,
  notOnAll,
  getFeatureState,
  onSetFeatureState,
}: ComponentBlockProps) {
  return (
    <div className="rounded-md border bg-card p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
        {component.component_name}
        {notOnAll && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
            not on all selected
          </span>
        )}
      </div>
      {component.features.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No features.</p>
      ) : (
        <div className="space-y-1.5">
          {component.features.map((f: Feature) => (
            <TriRow
              key={f.id}
              label={f.name}
              isMulti={isMulti}
              state={getFeatureState(f.id)}
              onSet={(s) => onSetFeatureState(f.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TriRowProps {
  label: string;
  isMulti: boolean;
  state: TriState;
  onSet: (state: TriState) => void;
}

// One row in the components/positions sections: a 3-button segmented control
// (or 2-button in single-graph mode where 'mixed' is unreachable) followed by
// the option label. Replaces the prior cycle-on-click checkbox UI, which was
// fast for power users but undiscoverable for everyone else — the explicit
// All/None/Mixed labels make the model obvious.
function TriRow({ label, isMulti, state, onSet }: TriRowProps) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex shrink-0 overflow-hidden rounded-md border"
      >
        <SegmentedButton
          active={state === 'all'}
          onClick={() => onSet('all')}
          ariaLabel={`Set ${label} on all selected`}
        >
          All
        </SegmentedButton>
        <SegmentedButton
          active={state === 'none'}
          onClick={() => onSet('none')}
          ariaLabel={`Remove ${label} from all selected`}
        >
          None
        </SegmentedButton>
        {isMulti && (
          <SegmentedButton
            active={state === 'mixed'}
            onClick={() => onSet('mixed')}
            ariaLabel={`Leave ${label} unchanged per graph`}
          >
            Mixed
          </SegmentedButton>
        )}
      </div>
      <span className="leading-snug text-foreground">{label}</span>
    </div>
  );
}

function SegmentedButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'min-w-[3rem] border-l px-2.5 py-1 text-xs font-medium transition first:border-l-0',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
