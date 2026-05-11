'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import {
  updateViewerAnnotation,
  type BackendGraph,
  type BackendGraphComponent,
} from '@/services/annotations';
import { formatAllographLabel } from '@/lib/allograph-labels';
import type { Allograph, Component, Feature } from '@/types/allographs';
import type { HandType } from '@/types/hands';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { SearchableOption } from '@/lib/searchable-option-ranking';

// Tri-state model: every toggleable thing (feature, position) is 'all' (set
// on every selected graph), 'none' (set on none), or 'mixed' (some have it).
// Cycle is mixed → all → none → mixed. Only all/none commit on save; mixed
// means "leave each graph alone." In single-graph mode mixed is unreachable.

type TriState = 'all' | 'none' | 'mixed';
const MIXED = 'mixed' as const;
const NEXT_STATE = { mixed: 'all', all: 'none', none: 'mixed' } as const;
const CHECKBOX_VALUE = { all: true, none: false, mixed: 'indeterminate' } as const;

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

// Multi-mode shows only components present on every selected graph; single
// mode shows all allograph-defined components. Feature definitions always
// come from the allograph schema (graph rows just store ids).
function visibleComponents(
  graphs: BackendGraph[],
  allograph: Allograph,
  isMulti: boolean
): Component[] {
  if (!isMulti) return allograph.components;
  return allograph.components.filter((c) =>
    graphs.every((g) => Boolean(findComponent(g, c.component_id)))
  );
}

// Single hook used by both the features and positions sections: a pending
// per-key tri-state map that shadows a baseline derived from the graphs.
interface TriStateMap<K extends string | number> {
  get: (key: K) => TriState;
  cycle: (key: K) => void;
  hasMeaningfulEdits: boolean;
  reset: () => void;
  edits: Partial<Record<K, TriState>>;
}

function useTriStateMap<K extends string | number>(baseline: (key: K) => TriState): TriStateMap<K> {
  const [edits, setEdits] = React.useState<Partial<Record<K, TriState>>>({});
  return {
    edits,
    get: (key) => edits[key] ?? baseline(key),
    cycle: (key) =>
      setEdits((prev) => ({ ...prev, [key]: NEXT_STATE[prev[key] ?? baseline(key)] })),
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
    () =>
      hands
        .map((h) => ({ value: String(h.id), label: h.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
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

  // Reset draft state whenever the selection (and therefore the initial
  // values) changes — otherwise switching selection mid-dialog leaves stale
  // tri-state values.
  React.useEffect(() => {
    setAllographId(initialAllograph === MIXED ? null : initialAllograph);
    setHand(initialHand);
    setError(null);
  }, [initialAllograph, initialHand]);

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
    () => (schemaAllograph ? visibleComponents(graphs, schemaAllograph, isMulti) : []),
    [graphs, schemaAllograph, isMulti]
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
  // for the same reason `setError(null)` resets above.
  React.useEffect(() => {
    featureMap.reset();
    positionMap.reset();
    // Intentionally only on selection change — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphs]);

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

  const handleSave = async () => {
    if (!token) {
      setError('Not authenticated.');
      return;
    }
    setSaving(true);
    setError(null);

    let savedCount = 0;
    let failedCount = 0;

    await Promise.all(
      graphs.map(async (graph) => {
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
          failedCount += 1;
        }
      })
    );

    setSaving(false);
    onComplete?.({ savedCount, failedCount });

    if (failedCount > 0) setError(`${failedCount} of ${graphs.length} failed to save.`);
    else onOpenChange(false);
  };

  // ---- Render -------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[640px] max-w-[calc(100vw-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isMulti ? `Edit ${graphs.length} graphs` : `Edit graph #${graphs[0].id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {isMulti && initialAllograph === MIXED && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Selected graphs use different allographs. Choose one to set on all of them, or close
              and refine the selection.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">Allograph</Label>
              <SearchableSelect
                options={allographOptions}
                value={allographId != null ? String(allographId) : null}
                onValueChange={(v) => setAllographId(v ? Number(v) : null)}
                placeholder={
                  isMulti && initialAllograph === MIXED ? 'Mixed — pick one' : 'Allograph'
                }
                searchPlaceholder="Search allographs…"
                emptyText="No allographs"
                triggerClassName="h-8 w-full text-xs"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Hand</Label>
              <SearchableSelect
                options={handOptions}
                value={hand === MIXED || hand == null ? null : String(hand)}
                onValueChange={(v) => setHand(v ? Number(v) : null)}
                placeholder={hand === MIXED ? 'Mixed — pick one' : 'Hand'}
                searchPlaceholder="Search hands…"
                emptyText="No hands"
                clearLabel="No hand"
                triggerClassName="h-8 w-full text-xs"
              />
            </div>
          </div>

          {schemaAllograph ? (
            <>
              {isMulti && (
                <p className="rounded border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  Click a checkbox to cycle: <span className="font-medium">all</span> (apply to
                  every selected graph) → <span className="font-medium">none</span> (remove from
                  every selected graph) → <span className="font-medium">mixed</span> (leave each
                  graph alone — current per-graph values are preserved on save).
                </p>
              )}

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Components &amp; features
                  {isMulti && (
                    <span className="ml-2 font-normal normal-case text-muted-foreground/80">
                      (showing only components shared by all selected)
                    </span>
                  )}
                </h3>
                {components.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isMulti
                      ? 'No components are shared across the selected graphs.'
                      : 'This allograph has no defined components.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {components.map((c) => (
                      <ComponentBlock
                        key={c.component_id}
                        component={c}
                        getFeatureState={(fId) => featureMap.get(featureKey(c.component_id, fId))}
                        onToggleFeature={(fId) => featureMap.cycle(featureKey(c.component_id, fId))}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Positions
                </h3>
                {schemaAllograph.positions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    This allograph has no defined positions.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {schemaAllograph.positions.map((p) => (
                      <TriCheckbox
                        key={p.id}
                        label={p.name}
                        state={positionMap.get(p.id)}
                        onToggle={() => positionMap.cycle(p.id)}
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasPendingChanges}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {isMulti ? `Save ${graphs.length} graphs` : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface ComponentBlockProps {
  component: Component;
  getFeatureState: (featureId: number) => TriState;
  onToggleFeature: (featureId: number) => void;
}

function ComponentBlock({ component, getFeatureState, onToggleFeature }: ComponentBlockProps) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="mb-2 text-xs font-medium">{component.component_name}</div>
      {component.features.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No features.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {component.features.map((f: Feature) => (
            <TriCheckbox
              key={f.id}
              label={f.name}
              state={getFeatureState(f.id)}
              onToggle={() => onToggleFeature(f.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TriCheckboxProps {
  label: string;
  state: TriState;
  onToggle: () => void;
}

function TriCheckbox({ label, state, onToggle }: TriCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox checked={CHECKBOX_VALUE[state]} onCheckedChange={onToggle} />
      {label}
    </label>
  );
}
