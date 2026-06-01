import { describe, expect, it } from 'vitest';

import {
  ACTIVE_POPUP_Z_INDEX,
  buildPopupAnnotationPayload,
  buildPositionDetails,
  DEFAULT_SINGLE_POPUP_POSITION,
  getAnnotationKindFromPopupRecord,
  getPopupCapabilities,
  getPopupCardViewData,
  getPopupEditorMode,
  getPopupInitialPosition,
  getPopupMetaSummary,
  getPopupZIndex,
  hasPopupAnnotationChanges,
  INACTIVE_POPUP_BASE_Z_INDEX,
  MULTI_POPUP_BASE_Y,
  MULTI_POPUP_OFFSET_STEP,
} from './manuscript-viewer-popup-utils';
import type {
  AnnotationPopupCapabilities,
  PopupRecord,
  ViewerCapabilities,
} from '@/types/annotation-viewer';

function makePopup(overrides: Partial<PopupRecord> = {}): PopupRecord {
  return {
    id: 'local-uuid',
    annotation: {
      id: 'local-uuid',
      type: 'Annotation',
      target: {},
      _meta: {},
    },
    popupTab: 'components',
    shareUrl: '',
    isShareUrlVisible: false,
    draftAllographText: '',
    draftNoteText: '',
    draftAllographId: null,
    draftHandId: null,
    draftInternalNoteText: '',
    draftGraphcomponentSet: [],
    draftPositionIds: [],
    ...overrides,
  } as PopupRecord;
}

function makeCaps(overrides: Partial<ViewerCapabilities> = {}): ViewerCapabilities {
  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: true,
    canCreateEditorialAnnotations: true,
    canPersistEditorialAnnotations: true,
    canDeleteAnnotations: true,
    canModifyAnnotations: true,
    canViewEditorialControls: true,
    canUseSettings: true,
    canUseEditorSettings: true,
    ...overrides,
  } as ViewerCapabilities;
}

describe('buildPositionDetails', () => {
  it('looks up names from the map when present', () => {
    const lookup = new Map<number, string>([
      [1, 'Initial'],
      [2, 'Medial'],
    ]);
    expect(buildPositionDetails([1, 2], lookup)).toEqual([
      { id: 1, name: 'Initial' },
      { id: 2, name: 'Medial' },
    ]);
  });

  it('falls back to "Position {id}" when the id is missing from the lookup', () => {
    // Regression: reassigning an allograph swaps positionNameById to a
    // different set. Without the fallback, positions from the previous
    // allograph silently disappear from positionDetails, even though the
    // backend keeps the id list intact.
    const lookup = new Map<number, string>([[1, 'Initial']]);
    expect(buildPositionDetails([1, 7, 99], lookup)).toEqual([
      { id: 1, name: 'Initial' },
      { id: 7, name: 'Position 7' },
      { id: 99, name: 'Position 99' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(buildPositionDetails([], new Map())).toEqual([]);
  });

  it('preserves the order of the input ids', () => {
    const lookup = new Map<number, string>([
      [1, 'A'],
      [2, 'B'],
      [3, 'C'],
    ]);
    expect(buildPositionDetails([3, 1, 2], lookup).map((p) => p.id)).toEqual([3, 1, 2]);
  });
});

describe('getAnnotationKindFromPopupRecord', () => {
  it('returns editorial when annotationType is editorial', () => {
    const popup = makePopup({
      annotation: { ...makePopup().annotation, _meta: { annotationType: 'editorial' } },
    });
    expect(getAnnotationKindFromPopupRecord(popup)).toBe('editorial');
  });

  it('returns public for any other annotationType', () => {
    const popup = makePopup({
      annotation: { ...makePopup().annotation, _meta: { annotationType: 'image' } },
    });
    expect(getAnnotationKindFromPopupRecord(popup)).toBe('public');
  });

  it('returns public when _meta is missing', () => {
    expect(getAnnotationKindFromPopupRecord(makePopup())).toBe('public');
  });
});

describe('hasPopupAnnotationChanges', () => {
  it('returns false when standard popup fields match the annotation', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: {
          allographId: 5,
          handId: 7,
          note: 'note',
          graphcomponentSet: [{ component: 11, features: [22, 21] }],
          positions: [2, 1],
        },
      },
      draftAllographId: 5,
      draftHandId: 7,
      draftNoteText: ' note ',
      draftGraphcomponentSet: [{ component: 11, features: [21, 22] }],
      draftPositionIds: [1, 2],
    });

    expect(hasPopupAnnotationChanges(popup)).toBe(false);
  });

  it('returns true when a standard popup field changes', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: { allographId: 5, handId: 7, note: 'before' },
      },
      draftAllographId: 5,
      draftHandId: 7,
      draftNoteText: 'after',
    });

    expect(hasPopupAnnotationChanges(popup)).toBe(true);
  });

  it('compares editorial popups by internal note', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: { annotationType: 'editorial', internalNote: 'before' },
      },
      draftInternalNoteText: 'after',
    });

    expect(hasPopupAnnotationChanges(popup)).toBe(true);
    expect(
      hasPopupAnnotationChanges({
        ...popup,
        draftInternalNoteText: ' before ',
      })
    ).toBe(false);
  });
});

describe('getPopupCapabilities', () => {
  it('draft + can-persist-public → canPersistDraft, canEditDraft, no collection', () => {
    const popup = makePopup({ annotation: { ...makePopup().annotation, id: 'local-uuid' } });
    const caps = getPopupCapabilities(popup, makeCaps());
    expect(caps.canEditDraft).toBe(true);
    expect(caps.canPersistDraft).toBe(true);
    expect(caps.canUseCollection).toBe(false);
    expect(caps.canShare).toBe(true);
  });

  it('persisted graph (db:) → canUseCollection, !canEditDraft, !canPersistDraft', () => {
    const popup = makePopup({ annotation: { ...makePopup().annotation, id: 'db:42' } });
    const caps = getPopupCapabilities(popup, makeCaps());
    expect(caps.canEditDraft).toBe(false);
    expect(caps.canPersistDraft).toBe(false);
    expect(caps.canUseCollection).toBe(true);
  });

  it('editorial draft routes through canPersistEditorialAnnotations, not the public one', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'local-uuid',
        _meta: { annotationType: 'editorial' },
      },
    });
    const noEditorial = getPopupCapabilities(
      popup,
      makeCaps({ canPersistEditorialAnnotations: false, canPersistPublicAnnotations: true })
    );
    expect(noEditorial.canPersistDraft).toBe(false);

    const withEditorial = getPopupCapabilities(
      popup,
      makeCaps({ canPersistEditorialAnnotations: true, canPersistPublicAnnotations: false })
    );
    expect(withEditorial.canPersistDraft).toBe(true);
  });

  it('canViewEditorMeta passes through viewerCapabilities', () => {
    const popup = makePopup();
    expect(
      getPopupCapabilities(popup, makeCaps({ canViewEditorialControls: false })).canViewEditorMeta
    ).toBe(false);
    expect(
      getPopupCapabilities(popup, makeCaps({ canViewEditorialControls: true })).canViewEditorMeta
    ).toBe(true);
  });
});

describe('getPopupCardViewData', () => {
  it('uses draftAllographText for a new public draft', () => {
    const popup = makePopup({ draftAllographText: '  Alpha  ' });
    const view = getPopupCardViewData(popup, new Map());
    expect(view.title).toBe('Alpha');
    expect(view.isDraft).toBe(true);
    expect(view.annotationKind).toBe('public');
  });

  it('falls back to "New Annotation" when draftAllographText is empty', () => {
    expect(getPopupCardViewData(makePopup(), new Map()).title).toBe('New Annotation');
  });

  it('uses the live allograph id for a persisted annotation when draft text is absent', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: { allographId: 5 },
      },
      draftAllographId: 5,
    });
    const lookup = new Map<number, string>([[5, 'Alpha allograph']]);
    expect(getPopupCardViewData(popup, lookup).title).toBe('Alpha allograph');
  });

  it('uses the live allograph text for a persisted annotation after the dropdown changes', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        body: [{ type: 'TextualBody', purpose: 'commenting', value: 'Old allograph' }],
        _meta: { allographId: 5 },
      },
      draftAllographId: 7,
      draftAllographText: 'New allograph',
    });
    const lookup = new Map<number, string>([
      [5, 'Old allograph'],
      [7, 'New allograph'],
    ]);
    expect(getPopupCardViewData(popup, lookup).title).toBe('New allograph');
  });

  it('falls back to "Annotation" for persisted with neither body text nor allograph name', () => {
    const popup = makePopup({
      annotation: { ...makePopup().annotation, id: 'db:99' },
    });
    expect(getPopupCardViewData(popup, new Map()).title).toBe('Annotation');
  });

  it('renders "Editorial Annotation" for editorial draft and existing', () => {
    const draft = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'local-uuid',
        _meta: { annotationType: 'editorial' },
      },
    });
    expect(getPopupCardViewData(draft, new Map()).title).toBe('Editorial Annotation');

    const existing = makePopup({
      annotation: { ...makePopup().annotation, id: 'db:1', _meta: { annotationType: 'editorial' } },
    });
    expect(getPopupCardViewData(existing, new Map()).title).toBe('Editorial Annotation');
  });

  it('exposes hasPositionsTab when positionDetails is non-empty', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: {
          positionDetails: [{ id: 1, name: 'Initial' }],
        },
      },
    });
    const view = getPopupCardViewData(popup, new Map());
    expect(view.hasPositionsTab).toBe(true);
    expect(view.selectedPositionLabels).toEqual(['Initial']);
  });

  it('falls back to "Position {id}" labels when name missing on positionDetails', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: {
          // @ts-expect-error force missing name to exercise fallback
          positionDetails: [{ id: 7 }],
        },
      },
    });
    expect(getPopupCardViewData(popup, new Map()).selectedPositionLabels).toEqual(['Position 7']);
  });

  it('falls back to position ids when positionDetails are absent', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: {
          positions: [7, 8],
        },
      },
    });
    expect(getPopupCardViewData(popup, new Map()).selectedPositionLabels).toEqual([
      'Position 7',
      'Position 8',
    ]);
  });

  it('builds component group labels with feature fallbacks', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: {
          graphcomponentSet: [
            {
              component: 11,
              componentName: 'Stem',
              features: [21, 22],
              featureDetails: [
                { id: 21, name: 'Curved' },
                { id: 22, name: 'Long' },
              ],
            },
            {
              // No name → falls back to "Component {id}"; no featureDetails → falls back to "Feature {id}"
              component: 12,
              features: [33],
            },
          ],
        },
      },
    });
    const view = getPopupCardViewData(popup, new Map());
    expect(view.selectedComponentGroups).toEqual([
      { componentId: 11, componentName: 'Stem', featureNames: ['Curved', 'Long'] },
      { componentId: 12, componentName: 'Component 12', featureNames: ['Feature 33'] },
    ]);
  });
});

describe('getPopupInitialPosition', () => {
  it('returns the single popup position when allowMultipleBoxes is false', () => {
    const result = getPopupInitialPosition(3, false, DEFAULT_SINGLE_POPUP_POSITION);
    expect(result).toBe(DEFAULT_SINGLE_POPUP_POSITION);
  });

  it('stacks multi-popup positions by index using the offset step', () => {
    expect(getPopupInitialPosition(0, true, DEFAULT_SINGLE_POPUP_POSITION)).toEqual({
      x: 0,
      y: MULTI_POPUP_BASE_Y,
    });
    expect(getPopupInitialPosition(2, true, DEFAULT_SINGLE_POPUP_POSITION)).toEqual({
      x: -2 * MULTI_POPUP_OFFSET_STEP,
      y: MULTI_POPUP_BASE_Y + 2 * MULTI_POPUP_OFFSET_STEP,
    });
  });
});

describe('getPopupZIndex', () => {
  it('returns the active z-index when isActive', () => {
    expect(getPopupZIndex(2, true)).toBe(ACTIVE_POPUP_Z_INDEX);
  });

  it('stacks inactive popups above the base by index', () => {
    expect(getPopupZIndex(0, false)).toBe(INACTIVE_POPUP_BASE_Z_INDEX);
    expect(getPopupZIndex(5, false)).toBe(INACTIVE_POPUP_BASE_Z_INDEX + 5);
  });
});

describe('getPopupMetaSummary', () => {
  it('looks up allograph and hand labels by id', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: { allographId: 5, handId: 7, annotationType: 'image' },
      },
      draftAllographId: 5,
      draftHandId: 7,
    });
    const summary = getPopupMetaSummary(popup, new Map([[5, 'Alpha']]), new Map([[7, 'Hand A']]));
    expect(summary).toEqual({ kindLabel: 'Public', allographLabel: 'Alpha', handLabel: 'Hand A' });
  });

  it('uses live dropdown selections instead of saved annotation metadata', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: { allographId: 5, handId: 7, annotationType: 'image' },
      },
      draftAllographId: 8,
      draftHandId: 9,
    });
    const summary = getPopupMetaSummary(
      popup,
      new Map([
        [5, 'Old alpha'],
        [8, 'New beta'],
      ]),
      new Map([
        [7, 'Old hand'],
        [9, 'New hand'],
      ])
    );
    expect(summary).toEqual({
      kindLabel: 'Public',
      allographLabel: 'New beta',
      handLabel: 'New hand',
    });
  });

  it('returns nulls when ids are missing from the lookup maps', () => {
    const popup = makePopup({
      annotation: { ...makePopup().annotation, _meta: { allographId: 99, handId: 99 } },
      draftAllographId: 99,
      draftHandId: 99,
    });
    const summary = getPopupMetaSummary(popup, new Map(), new Map());
    expect(summary.allographLabel).toBeNull();
    expect(summary.handLabel).toBeNull();
  });

  it('reports Editorial kindLabel for editorial annotations', () => {
    const popup = makePopup({
      annotation: { ...makePopup().annotation, _meta: { annotationType: 'editorial' } },
    });
    expect(getPopupMetaSummary(popup, new Map(), new Map()).kindLabel).toBe('Editorial');
  });
});

describe('getPopupEditorMode', () => {
  function modeFor(args: {
    id: string;
    editorial: boolean;
    caps: Partial<AnnotationPopupCapabilities>;
  }) {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: args.id,
        _meta: { annotationType: args.editorial ? 'editorial' : undefined },
      },
    });
    return getPopupEditorMode(popup, {
      canShare: true,
      canUseCollection: false,
      canEditDraft: false,
      canPersistDraft: false,
      canViewEditorMeta: false,
      ...args.caps,
    });
  }

  it('persisted editorial → editorial_existing', () => {
    expect(modeFor({ id: 'db:1', editorial: true, caps: {} })).toBe('editorial_existing');
  });

  it('persisted public with editor meta access → standard_existing', () => {
    expect(modeFor({ id: 'db:1', editorial: false, caps: { canViewEditorMeta: true } })).toBe(
      'standard_existing'
    );
  });

  it('persisted public without editor meta access → public_existing', () => {
    expect(modeFor({ id: 'db:1', editorial: false, caps: { canViewEditorMeta: false } })).toBe(
      'public_existing'
    );
  });

  it('editorial draft → editorial_draft', () => {
    expect(modeFor({ id: 'local-uuid', editorial: true, caps: {} })).toBe('editorial_draft');
  });

  it('public draft that can persist → standard_draft', () => {
    expect(modeFor({ id: 'local-uuid', editorial: false, caps: { canPersistDraft: true } })).toBe(
      'standard_draft'
    );
  });

  it('public draft that cannot persist → public_demo_draft', () => {
    expect(modeFor({ id: 'local-uuid', editorial: false, caps: { canPersistDraft: false } })).toBe(
      'public_demo_draft'
    );
  });
});

describe('buildPopupAnnotationPayload', () => {
  const positionNameById = new Map<number, string>([
    [1, 'Initial'],
    [2, 'Medial'],
  ]);

  function popupWithDrafts(): PopupRecord {
    return makePopup({
      annotation: { ...makePopup().annotation, _meta: { allographId: 99 } },
      draftAllographId: 5,
      draftAllographText: '  alpha  ',
      draftHandId: 7,
      draftNoteText: '  some note  ',
      draftInternalNoteText: '  editorial commentary  ',
      draftGraphcomponentSet: [{ component: 11, features: [21] }],
      draftPositionIds: [1, 2, 99],
    });
  }

  it('standard payload pulls draft fields onto popup.annotation', () => {
    const popup = popupWithDrafts();
    const out = buildPopupAnnotationPayload({ popup, isEditorial: false, positionNameById });
    expect(out._meta?.allographId).toBe(5);
    expect(out._meta?.handId).toBe(7);
    expect(out._meta?.note).toBe('some note'); // trimmed
    expect(out._meta?.graphcomponentSet).toEqual([{ component: 11, features: [21] }]);
    expect(out._meta?.positions).toEqual([1, 2, 99]);
    expect(out._meta?.positionDetails).toEqual([
      { id: 1, name: 'Initial' },
      { id: 2, name: 'Medial' },
      { id: 99, name: 'Position 99' }, // fallback for unmapped id
    ]);
  });

  it('standard payload preserves non-overridden _meta from source', () => {
    // `annotationType` from source survives; allographId is overridden.
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        _meta: { allographId: 1, annotationType: 'image', internalNote: 'keep me' },
      },
      draftAllographId: 5,
    });
    const out = buildPopupAnnotationPayload({ popup, isEditorial: false, positionNameById });
    expect(out._meta?.allographId).toBe(5);
    expect(out._meta?.annotationType).toBe('image');
    expect(out._meta?.internalNote).toBe('keep me');
  });

  it('editorial payload zeros out allograph/hand/components/positions', () => {
    const popup = popupWithDrafts();
    const out = buildPopupAnnotationPayload({ popup, isEditorial: true, positionNameById });
    expect(out._meta?.annotationType).toBe('editorial');
    expect(out._meta?.allographId).toBeUndefined();
    expect(out._meta?.handId).toBeUndefined();
    expect(out._meta?.graphcomponentSet).toEqual([]);
    expect(out._meta?.positions).toEqual([]);
    expect(out._meta?.positionDetails).toEqual([]);
    expect(out._meta?.internalNote).toBe('editorial commentary');
  });

  it('editorial payload preserves details already stored on an existing annotation', () => {
    const popup = makePopup({
      annotation: {
        ...makePopup().annotation,
        id: 'db:1',
        _meta: {
          annotationType: 'editorial',
          allographId: 5,
          handId: 7,
          graphcomponentSet: [{ component: 11, features: [21] }],
          positions: [1],
          positionDetails: [{ id: 1, name: 'Initial' }],
          internalNote: 'before',
        },
      },
      draftInternalNoteText: 'after',
    });
    const out = buildPopupAnnotationPayload({ popup, isEditorial: true, positionNameById });
    expect(out._meta?.allographId).toBe(5);
    expect(out._meta?.handId).toBe(7);
    expect(out._meta?.graphcomponentSet).toEqual([{ component: 11, features: [21] }]);
    expect(out._meta?.positions).toEqual([1]);
    expect(out._meta?.positionDetails).toEqual([{ id: 1, name: 'Initial' }]);
    expect(out._meta?.internalNote).toBe('after');
  });

  it('editorial body is internal-note only', () => {
    const popup = popupWithDrafts();
    const out = buildPopupAnnotationPayload({ popup, isEditorial: true, positionNameById });
    expect(out.body).toBeDefined();
    // Standard body would include the draftAllographText; editorial path skips it.
    expect(JSON.stringify(out.body)).not.toContain('alpha');
  });

  it('explicit base overrides popup.annotation as the merge target', () => {
    const popup = popupWithDrafts();
    const otherBase = {
      id: 'other-draft',
      type: 'Annotation',
      target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:9,9,9,9' } },
      _meta: { allographId: 1, internalNote: 'sticky-from-base' },
    } as PopupRecord['annotation'];
    const out = buildPopupAnnotationPayload({
      popup,
      isEditorial: false,
      positionNameById,
      base: otherBase,
    });
    // The base's id + target survive (only _meta and body are rebuilt).
    expect(out.id).toBe('other-draft');
    expect(JSON.stringify(out.target)).toContain('9,9,9,9');
    // Standard payload still applies the popup's draft allograph onto the base's _meta.
    expect(out._meta?.allographId).toBe(5);
    // Base's _meta.internalNote survives (not overridden by the standard path).
    expect(out._meta?.internalNote).toBe('sticky-from-base');
  });
});
