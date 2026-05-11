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
import type { Allograph, Feature } from '@/types/allographs';
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

// ---------------------------------------------------------------------------
// Tri-state model
// ---------------------------------------------------------------------------
//
// In multi-graph mode, each toggleable thing (a feature, a position) is in one
// of three states across the selected set:
//   - 'all'  : every selected graph has it set
//   - 'none' : no selected graph has it set
//   - 'mixed': some selected graphs have it, others don't
//
// The user can move a checkbox to 'all' (apply to all) or 'none' (remove from
// all). 'mixed' is initial-only and means "leave per-graph values alone."
//
// In single-graph mode there's no 'mixed' — it's just a normal binary checkbox.

type TriState = 'all' | 'none' | 'mixed';

function nextTriState(current: TriState): TriState {
  // Cycle: mixed -> all -> none -> mixed (mixed reachable only by re-derive,
  // but we let the user "undo" their pending change back to it via this cycle).
  if (current === 'mixed') return 'all';
  if (current === 'all') return 'none';
  return 'mixed';
}

function deriveTriState(graphs: BackendGraph[], hasIt: (g: BackendGraph) => boolean): TriState {
  if (graphs.length === 0) return 'none';
  let trueCount = 0;
  for (const g of graphs) if (hasIt(g)) trueCount += 1;
  if (trueCount === 0) return 'none';
  if (trueCount === graphs.length) return 'all';
  return 'mixed';
}

function checkboxValue(state: TriState): boolean | 'indeterminate' {
  if (state === 'all') return true;
  if (state === 'none') return false;
  return 'indeterminate';
}

// ---------------------------------------------------------------------------
// Common-allograph + common-component derivation
// ---------------------------------------------------------------------------

function commonAllographId(graphs: BackendGraph[]): number | null {
  if (graphs.length === 0) return null;
  const first = graphs[0].allograph;
  if (first == null) return null;
  for (let i = 1; i < graphs.length; i += 1) {
    if (graphs[i].allograph !== first) return null;
  }
  return first;
}

function commonHandId(graphs: BackendGraph[]): number | null | 'mixed' {
  if (graphs.length === 0) return null;
  const first = graphs[0].hand ?? null;
  for (let i = 1; i < graphs.length; i += 1) {
    if ((graphs[i].hand ?? null) !== first) return 'mixed';
  }
  return first;
}

// "Common components" = components present on all selected graphs (intersected
// by component id). Each common component carries the union of its features
// across selected graphs (so the user can toggle features on graphs that
// already share the component).
interface CommonComponent {
  componentId: number;
  componentName: string;
  features: Feature[];
}

function commonComponents(graphs: BackendGraph[], allograph: Allograph | null): CommonComponent[] {
  if (graphs.length === 0 || allograph == null) return [];

  // The intersection of component ids across all selected graphs.
  const idSets = graphs.map((g) => new Set((g.graphcomponent_set ?? []).map((c) => c.component)));
  const sharedIds = new Set<number>();
  for (const id of idSets[0]) {
    if (idSets.every((set) => set.has(id))) sharedIds.add(id);
  }

  // Pull feature definitions from the (single) common allograph schema; this
  // is the only authoritative source we have for *what features mean*. If a
  // component is shared by graphs but isn't on the allograph schema, skip it
  // — there are no feature definitions to render.
  return allograph.components
    .filter((c) => sharedIds.has(c.component_id))
    .map((c) => ({
      componentId: c.component_id,
      componentName: c.component_name,
      features: c.features,
    }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function graphHasFeature(graph: BackendGraph, componentId: number, featureId: number) {
  const c = (graph.graphcomponent_set ?? []).find((x) => x.component === componentId);
  return c ? c.features.includes(featureId) : false;
}

function graphHasPosition(graph: BackendGraph, positionId: number) {
  return (graph.positions ?? []).includes(positionId);
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
  // Called after every successful per-graph PATCH so the parent can update
  // its optimistic view immediately. Receives the freshly-saved graph from
  // the server.
  onGraphSaved?: (graph: BackendGraph) => void;
  // Called once the dialog finishes its save batch (success or partial).
  onComplete?: (result: { savedCount: number; failedCount: number }) => void;
}

export function AnnotationEditDialog({
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

  // ---- Initial values from the selection ---------------------------------
  const initialAllographId = React.useMemo(() => commonAllographId(graphs), [graphs]);
  const initialHand = React.useMemo(() => commonHandId(graphs), [graphs]);

  // ---- Editable state ----------------------------------------------------
  const [allographId, setAllographId] = React.useState<number | null>(initialAllographId);
  const [handId, setHandId] = React.useState<number | null | 'mixed'>(initialHand);
  // Per-feature pending state, keyed by `${componentId}:${featureId}`.
  const [featureStates, setFeatureStates] = React.useState<Record<string, TriState>>({});
  // Per-position pending state, keyed by positionId.
  const [positionStates, setPositionStates] = React.useState<Record<number, TriState>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset draft state whenever the selection changes or the dialog reopens —
  // otherwise switching selection mid-dialog leaves stale tri-state values.
  React.useEffect(() => {
    if (!open) return;
    setAllographId(initialAllographId);
    setHandId(initialHand);
    setFeatureStates({});
    setPositionStates({});
    setError(null);
  }, [open, initialAllographId, initialHand]);

  const selectedAllograph = React.useMemo(
    () => (allographId != null ? (allographs.find((a) => a.id === allographId) ?? null) : null),
    [allographs, allographId]
  );

  // The "schema source" for what features/positions are editable. In multi-
  // mode that's the common allograph (and only when all selected agree on it
  // — otherwise we hide the components/positions sections and prompt the user
  // to pick one).
  const schemaAllograph: Allograph | null =
    isMulti && initialAllographId == null ? null : selectedAllograph;

  const components: CommonComponent[] = React.useMemo(() => {
    if (!schemaAllograph) return [];
    if (!isMulti) {
      // Single-graph mode: show every component the allograph defines.
      return schemaAllograph.components.map((c) => ({
        componentId: c.component_id,
        componentName: c.component_name,
        features: c.features,
      }));
    }
    // Multi: only components common to every selected graph (and on schema).
    return commonComponents(graphs, schemaAllograph);
  }, [graphs, schemaAllograph, isMulti]);

  // Resolve initial tri-state for a feature from the selected graphs.
  const featureStateFor = React.useCallback(
    (componentId: number, featureId: number): TriState => {
      const key = `${componentId}:${featureId}`;
      const pending = featureStates[key];
      if (pending) return pending;
      return deriveTriState(graphs, (g) => graphHasFeature(g, componentId, featureId));
    },
    [graphs, featureStates]
  );

  const positionStateFor = React.useCallback(
    (positionId: number): TriState => {
      const pending = positionStates[positionId];
      if (pending) return pending;
      return deriveTriState(graphs, (g) => graphHasPosition(g, positionId));
    },
    [graphs, positionStates]
  );

  const cycleFeature = (componentId: number, featureId: number) => {
    const key = `${componentId}:${featureId}`;
    const current = featureStateFor(componentId, featureId);
    setFeatureStates((prev) => ({ ...prev, [key]: nextTriState(current) }));
  };

  const cyclePosition = (positionId: number) => {
    const current = positionStateFor(positionId);
    setPositionStates((prev) => ({ ...prev, [positionId]: nextTriState(current) }));
  };

  // ---- Save --------------------------------------------------------------

  // Compute the new graphcomponent_set + positions for one specific graph
  // by applying the dialog's pending tri-states on top of the graph's current
  // values. Only edits that resolve to 'all' or 'none' are applied; 'mixed'
  // means "leave alone."
  const buildPatchForGraph = (graph: BackendGraph) => {
    const patch: {
      allograph?: number;
      hand?: number | null;
      graphcomponent_set?: BackendGraphComponent[];
      positions?: number[];
    } = {};

    if (allographId != null && allographId !== graph.allograph) {
      patch.allograph = allographId;
    }
    if (handId !== 'mixed' && handId !== (graph.hand ?? null)) {
      patch.hand = handId;
    }

    // Compose feature/position changes only if the user touched something.
    const hasFeatureEdits = Object.keys(featureStates).length > 0;
    const hasPositionEdits = Object.keys(positionStates).length > 0;

    if (hasFeatureEdits) {
      // Start from current per-graph component set; we mutate per-feature
      // entries in place and may add/remove component rows as features are
      // toggled on/off entirely.
      const next: BackendGraphComponent[] = (graph.graphcomponent_set ?? []).map((c) => ({
        ...c,
        features: [...c.features],
      }));

      for (const [key, state] of Object.entries(featureStates)) {
        if (state === 'mixed') continue;
        const [componentIdRaw, featureIdRaw] = key.split(':');
        const componentId = Number(componentIdRaw);
        const featureId = Number(featureIdRaw);
        const wantSet = state === 'all';

        let entry = next.find((c) => c.component === componentId);

        if (wantSet) {
          if (!entry) {
            entry = { component: componentId, features: [] };
            next.push(entry);
          }
          if (!entry.features.includes(featureId)) entry.features.push(featureId);
        } else if (entry) {
          entry.features = entry.features.filter((f) => f !== featureId);
        }
      }

      // Drop empty component rows (no features left) so we don't persist
      // dangling components.
      patch.graphcomponent_set = next.filter((c) => c.features.length > 0);
    }

    if (hasPositionEdits) {
      const set = new Set<number>(graph.positions ?? []);
      for (const [posIdRaw, state] of Object.entries(positionStates)) {
        if (state === 'mixed') continue;
        const posId = Number(posIdRaw);
        if (state === 'all') set.add(posId);
        else set.delete(posId);
      }
      patch.positions = Array.from(set).sort((a, b) => a - b);
    }

    return patch;
  };

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
        // Skip graphs with nothing to save (for example: in multi mode, the
        // user only edited features that 'mixed' kept untouched).
        if (Object.keys(patch).length === 0) {
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

    if (failedCount > 0) {
      setError(`${failedCount} of ${graphs.length} failed to save.`);
    } else {
      onOpenChange(false);
    }
  };

  // ---- Render ------------------------------------------------------------

  const allographValue = allographId != null ? String(allographId) : null;
  const handValue = handId === 'mixed' || handId == null ? null : String(handId);

  const positions = schemaAllograph?.positions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[640px] max-w-[calc(100vw-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isMulti ? `Edit ${graphs.length} graphs` : `Edit graph #${graphs[0]?.id ?? ''}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {isMulti && initialAllographId == null && (
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
                value={allographValue}
                onValueChange={(v) => setAllographId(v ? Number(v) : null)}
                placeholder={
                  isMulti && initialAllographId == null ? 'Mixed — pick one' : 'Allograph'
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
                value={handValue}
                onValueChange={(v) => setHandId(v ? Number(v) : null)}
                placeholder={handId === 'mixed' ? 'Mixed — pick one' : 'Hand'}
                searchPlaceholder="Search hands…"
                emptyText="No hands"
                triggerClassName="h-8 w-full text-xs"
                clearLabel="No hand"
              />
            </div>
          </div>

          {schemaAllograph ? (
            <>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Components &amp; features
                  {isMulti && (
                    <span className="ml-2 normal-case font-normal text-muted-foreground/80">
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
                        key={c.componentId}
                        component={c}
                        getFeatureState={(fId) => featureStateFor(c.componentId, fId)}
                        onToggleFeature={(fId) => cycleFeature(c.componentId, fId)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Positions
                </h3>
                {positions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    This allograph has no defined positions.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {positions.map((p) => {
                      const state = positionStateFor(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 text-xs"
                        >
                          <Checkbox
                            checked={checkboxValue(state)}
                            onCheckedChange={() => cyclePosition(p.id)}
                          />
                          {p.name}
                        </label>
                      );
                    })}
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
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ComponentBlockProps {
  component: CommonComponent;
  getFeatureState: (featureId: number) => TriState;
  onToggleFeature: (featureId: number) => void;
}

function ComponentBlock({ component, getFeatureState, onToggleFeature }: ComponentBlockProps) {
  return (
    <div className="rounded border bg-card p-3">
      <div className="mb-2 text-xs font-medium">{component.componentName}</div>
      {component.features.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No features.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {component.features.map((f: Feature) => {
            const state = getFeatureState(f.id);
            return (
              <label key={f.id} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={checkboxValue(state)}
                  onCheckedChange={() => onToggleFeature(f.id)}
                />
                {f.name}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
