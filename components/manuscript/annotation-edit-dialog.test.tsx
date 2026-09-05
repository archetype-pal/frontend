import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnotationEditDialog } from './annotation-edit-dialog';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { BackendGraph } from '@/services/annotations';

// Regression coverage for two data-corruption bugs found and fixed while
// edge-case testing the bulk-edit dialog (frontend #129): switching the
// Allograph mid-edit could leak a pending edit from the old allograph's
// schema into the save, and — independently — a graph's *existing*
// components/positions from an allograph it had since moved on from
// survived every save untouched, accumulating indefinitely. Both live in
// `buildPatchForGraph`, a closure with no seams to unit-test directly, so
// these drive the real dialog UI and assert on the PATCH payload sent to
// `updateViewerAnnotation`.

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: null,
    isReady: true,
    setToken: vi.fn(),
    logout: vi.fn(),
  }),
}));

const updateViewerAnnotationMock = vi.fn();
vi.mock('@/services/annotations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/annotations')>();
  return {
    ...actual,
    updateViewerAnnotation: (...args: unknown[]) => updateViewerAnnotationMock(...args),
  };
});

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

// Two allographs with fully disjoint component/feature/position schemas —
// mirrors the live repro (allograph "l"/component "ascender" vs allograph
// "c"/component "lower curve") closely enough to prove the same thing: a
// component/position that belongs to one allograph must never survive a
// save once a different allograph is in play.
const ALLOGRAPH_A: Allograph = {
  id: 1,
  name: 'a-shape',
  components: [
    {
      component_id: 10,
      component_name: 'stem',
      features: [{ id: 100, name: 'curved', set_by_default: false }],
    },
  ],
  positions: [{ id: 1000, name: 'initial' }],
};

const ALLOGRAPH_B: Allograph = {
  id: 2,
  name: 'b-shape',
  components: [
    {
      component_id: 20,
      component_name: 'bowl',
      features: [{ id: 200, name: 'closed', set_by_default: false }],
    },
  ],
  positions: [{ id: 2000, name: 'medial' }],
};

// A third allograph, disjoint from both A and B, that neither graph starts
// on — for the mixed-multi-selection scenario, where two graphs starting on
// two different allographs both get bulk-assigned to a third.
const ALLOGRAPH_C: Allograph = {
  id: 3,
  name: 'c-shape',
  components: [
    {
      component_id: 30,
      component_name: 'loop',
      features: [{ id: 300, name: 'open', set_by_default: false }],
    },
  ],
  positions: [],
};

const HAND: HandType = {
  id: 5,
  name: 'Main Hand',
  scribe: 1,
  item_part: 1,
  date: '',
  place: '',
  description: '',
};

function makeGraph(overrides: Partial<BackendGraph> = {}): BackendGraph {
  return {
    id: 39,
    item_image: 1,
    item_part: 1,
    image_iiif: '',
    annotation_type: 'image',
    note: '',
    internal_note: '',
    annotation: {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0]]] },
    },
    allograph: 1,
    allograph_name: 'a-shape',
    hand: 5,
    graphcomponent_set: [],
    positions: [],
    ...overrides,
  } as BackendGraph;
}

async function switchAllographTo(label: string) {
  fireEvent.click(screen.getAllByRole('combobox')[0]);
  const search = await screen.findByPlaceholderText('Search allographs…');
  fireEvent.change(search, { target: { value: label } });
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

describe('AnnotationEditDialog — allograph-switch save correctness', () => {
  beforeEach(() => {
    updateViewerAnnotationMock.mockReset();
    updateViewerAnnotationMock.mockResolvedValue(makeGraph());
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('does not leak a pending feature edit from the old allograph into the save after switching allographs', async () => {
    const graph = makeGraph({ allograph: 1, graphcomponent_set: [] });

    render(
      <AnnotationEditDialog
        open
        onOpenChange={vi.fn()}
        graphs={[graph]}
        allographs={[ALLOGRAPH_A, ALLOGRAPH_B]}
        hands={[HAND]}
      />
    );

    // Set allograph A's only feature to "All" — a pending, unsaved edit.
    fireEvent.click(screen.getByRole('radio', { name: 'Set curved on all selected' }));

    // Switch to allograph B, whose schema is fully disjoint from A's.
    await switchAllographTo('b-shape');

    // Save button must be enabled purely because the allograph itself
    // changed, not because of the stale feature edit.
    const saveButton = screen.getByRole('button', { name: /^Save/ }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => expect(updateViewerAnnotationMock).toHaveBeenCalledTimes(1));
    const [, , patch] = updateViewerAnnotationMock.mock.calls[0];
    expect(patch.allograph).toBe(2);
    // The critical assertion: component 10 (allograph A's "stem") must not
    // appear anywhere in the saved payload.
    expect(patch.graphcomponent_set).toBeUndefined();
  });

  it('prunes an existing component that no longer belongs to the current allograph when saving any other edit', async () => {
    // Simulates a graph that already accumulated a stale component from a
    // prior allograph switch (or a pre-fix save) — allograph is A, but it
    // still carries a component from B's schema.
    const graph = makeGraph({
      allograph: 1,
      graphcomponent_set: [{ component: 20, features: [200] }],
    });

    render(
      <AnnotationEditDialog
        open
        onOpenChange={vi.fn()}
        graphs={[graph]}
        allographs={[ALLOGRAPH_A, ALLOGRAPH_B]}
        hands={[HAND]}
      />
    );

    // Make an unrelated real edit under the graph's current allograph (A)
    // so Save is enabled — the prune itself doesn't gate the button.
    fireEvent.click(screen.getByRole('radio', { name: 'Set curved on all selected' }));

    fireEvent.click(screen.getByRole('button', { name: /^Save/ }));

    await waitFor(() => expect(updateViewerAnnotationMock).toHaveBeenCalledTimes(1));
    const [, , patch] = updateViewerAnnotationMock.mock.calls[0];

    expect(patch.graphcomponent_set).toEqual([{ component: 10, features: [100] }]);
    // Component 20 (from allograph B's schema, not A's) must be dropped,
    // not carried forward alongside the new edit.
    const componentIds = (patch.graphcomponent_set as { component: number }[]).map(
      (c) => c.component
    );
    expect(componentIds).not.toContain(20);
  });

  it('prunes each graph to the bulk-assigned allograph when the original selection was mixed', async () => {
    // Two graphs starting on two different allographs — `initialAllograph`
    // is MIXED, which used to pin `schemaAllograph` to null for the whole
    // dialog session even after picking one, silently skipping the prune
    // for both graphs.
    const graphA = makeGraph({
      id: 39,
      allograph: 1,
      graphcomponent_set: [{ component: 10, features: [100] }],
    });
    const graphB = makeGraph({
      id: 41,
      allograph: 2,
      graphcomponent_set: [{ component: 20, features: [200] }],
    });

    render(
      <AnnotationEditDialog
        open
        onOpenChange={vi.fn()}
        graphs={[graphA, graphB]}
        allographs={[ALLOGRAPH_A, ALLOGRAPH_B, ALLOGRAPH_C]}
        hands={[HAND]}
      />
    );

    // Mixed-selection banner and the "pick one" placeholder are both shown
    // before any allograph is chosen.
    expect(screen.getByText(/Selected graphs use different allographs/)).toBeDefined();

    await switchAllographTo('c-shape');

    // Banner clears once an allograph has been picked, and the components
    // section — driven by the newly-picked allograph's schema — becomes
    // editable instead of staying stuck on "pick an allograph".
    expect(screen.queryByText(/Selected graphs use different allographs/)).toBeNull();
    expect(screen.getByRole('radio', { name: 'Set open on all selected' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /^Save/ }));

    await waitFor(() => expect(updateViewerAnnotationMock).toHaveBeenCalledTimes(2));
    const patchByGraphId = new Map(
      updateViewerAnnotationMock.mock.calls.map((call) => [call[1], call[2]])
    );

    // Both graphs' old, now-foreign components must be pruned — neither
    // "stem" (A) nor "bowl" (B) belongs to "loop" (C)'s schema.
    expect(patchByGraphId.get(39)).toEqual({ allograph: 3, graphcomponent_set: [] });
    expect(patchByGraphId.get(41)).toEqual({ allograph: 3, graphcomponent_set: [] });
  });
});
