import { describe, expect, it } from 'vitest';

import {
  computeVisibilityFilterActive,
  passesVisibilityFilter,
  type VisibilityFilterContext,
} from './manuscript-viewer-filters';

function ctx(overrides: Partial<VisibilityFilterContext> = {}): VisibilityFilterContext {
  return {
    ready: true,
    filters: {
      allographIds: [1, 2],
      handIds: [10],
      showEditorial: true,
      showPublicAnnotations: true,
    },
    hasAllographFilters: true,
    hasHandFilters: true,
    viewMode: 'allograph',
    ...overrides,
  };
}

describe('passesVisibilityFilter', () => {
  it('shows everything before the filters are ready', () => {
    expect(
      passesVisibilityFilter({ annotationType: 'editorial' }, false, ctx({ ready: false }))
    ).toBe(true);
  });

  it('shows text-region annotations in text/both modes, hides them in allograph', () => {
    expect(
      passesVisibilityFilter({ annotationType: 'text' }, false, ctx({ viewMode: 'allograph' }))
    ).toBe(false);
    expect(
      passesVisibilityFilter({ annotationType: 'text' }, false, ctx({ viewMode: 'text' }))
    ).toBe(true);
    expect(
      passesVisibilityFilter({ annotationType: 'text' }, false, ctx({ viewMode: 'both' }))
    ).toBe(true);
  });

  it('hides the glyph (allograph) layer in pure text mode', () => {
    expect(
      passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx({ viewMode: 'text' }))
    ).toBe(false);
    // ...but shows it in allograph and both
    expect(
      passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx({ viewMode: 'allograph' }))
    ).toBe(true);
    expect(
      passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx({ viewMode: 'both' }))
    ).toBe(true);
  });

  it('hides glyph drafts in text mode too — layer-based, not persistence-based', () => {
    // Regression: a newly-drawn allograph box keeps its client id (draft) until
    // it's saved, and used to leak into text view while identical SAVED boxes
    // hid. The glyph layer is hidden in pure text view regardless of saved-vs-
    // draft, so a just-drawn 'public' graph is hidden like every other glyph.
    expect(
      passesVisibilityFilter(
        { annotationType: 'public', allographId: 1, handId: 10 },
        true,
        ctx({ viewMode: 'text' })
      )
    ).toBe(false);
    // an untyped draft is also hidden — text-link boxes are typed 'text' at draw
    // time, so nothing legitimately reaches text view untyped.
    expect(passesVisibilityFilter(undefined, true, ctx({ viewMode: 'text' }))).toBe(false);
    // saved glyph — unchanged, still hidden.
    expect(
      passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx({ viewMode: 'text' }))
    ).toBe(false);
  });

  it('keeps text-region boxes visible in text mode whether draft or saved', () => {
    // Text-link boxes are tagged annotationType:'text' at draw time
    // (toTextRegionDraft, via startPendingLink / tryLinkRegion), so they stay
    // visible across the whole draw→link async window in pure text view — their
    // visibility no longer depends on the draft flag.
    expect(
      passesVisibilityFilter({ annotationType: 'text' }, true, ctx({ viewMode: 'text' }))
    ).toBe(true);
    expect(
      passesVisibilityFilter({ annotationType: 'text' }, false, ctx({ viewMode: 'text' }))
    ).toBe(true);
  });

  it('hides editorial annotations when showEditorial is off', () => {
    const c = ctx({ filters: { ...ctx().filters, showEditorial: false } });
    expect(
      passesVisibilityFilter({ annotationType: 'editorial', allographId: 1, handId: 10 }, false, c)
    ).toBe(false);
  });

  it('hides public DRAFTS when showPublicAnnotations is off (saved ones still show)', () => {
    const c = ctx({ filters: { ...ctx().filters, showPublicAnnotations: false } });
    // draft public → gated by showPublicAnnotations
    expect(passesVisibilityFilter({ allographId: 1, handId: 10 }, true, c)).toBe(false);
    // saved (non-draft, non-editorial) → always kind-passes
    expect(passesVisibilityFilter({ allographId: 1, handId: 10 }, false, c)).toBe(true);
  });

  it('filters by allograph id when allograph filters are available', () => {
    expect(passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx())).toBe(true);
    expect(passesVisibilityFilter({ allographId: 99, handId: 10 }, false, ctx())).toBe(false);
  });

  it('filters by hand id when hand filters are available', () => {
    expect(passesVisibilityFilter({ allographId: 1, handId: 10 }, false, ctx())).toBe(true);
    expect(passesVisibilityFilter({ allographId: 1, handId: 77 }, false, ctx())).toBe(false);
  });

  it('does not filter by allograph/hand when those filter sets are empty', () => {
    const c = ctx({ hasAllographFilters: false, hasHandFilters: false });
    expect(passesVisibilityFilter({ allographId: 99, handId: 77 }, false, c)).toBe(true);
  });

  it('passes annotations with null allograph/hand ids regardless of filter sets', () => {
    expect(passesVisibilityFilter({ allographId: null, handId: null }, false, ctx())).toBe(true);
  });
});

describe('computeVisibilityFilterActive', () => {
  const base = {
    ready: true,
    allAllographFiltersSelected: true,
    allHandFiltersSelected: true,
    canViewEditorialControls: true,
    showEditorial: true,
    showPublicAnnotations: true,
  };

  it('is inactive when nothing is narrowed', () => {
    expect(computeVisibilityFilterActive(base)).toBe(false);
  });

  it('is inactive before ready, even if narrowed', () => {
    expect(
      computeVisibilityFilterActive({ ...base, ready: false, allAllographFiltersSelected: false })
    ).toBe(false);
  });

  it('is active when an allograph or hand subset is selected', () => {
    expect(computeVisibilityFilterActive({ ...base, allAllographFiltersSelected: false })).toBe(
      true
    );
    expect(computeVisibilityFilterActive({ ...base, allHandFiltersSelected: false })).toBe(true);
  });

  it('is active when editorial is hidden (only if the user can view editorial)', () => {
    expect(computeVisibilityFilterActive({ ...base, showEditorial: false })).toBe(true);
    expect(
      computeVisibilityFilterActive({
        ...base,
        showEditorial: false,
        canViewEditorialControls: false,
      })
    ).toBe(false);
  });

  it('is active when public annotations are hidden', () => {
    expect(computeVisibilityFilterActive({ ...base, showPublicAnnotations: false })).toBe(true);
  });
});
