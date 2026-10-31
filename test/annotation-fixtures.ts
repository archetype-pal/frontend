import type { BackendGraph } from '@/services/annotations';
import type { A9sWithMeta, PopupRecord, ViewerCapabilities } from '@/types/annotation-viewer';

/** Every capability granted: the signed-in editor. */
export const EDITING_CAPS: ViewerCapabilities = {
  canCreatePublicAnnotations: true,
  canPersistPublicAnnotations: true,
  canCreateEditorialAnnotations: true,
  canPersistEditorialAnnotations: true,
  canDeleteAnnotations: true,
  canModifyAnnotations: true,
  canViewEditorialControls: true,
  canUseSettings: true,
  canUseEditorSettings: true,
};

export const makeCaps = (overrides: Partial<ViewerCapabilities> = {}): ViewerCapabilities => ({
  ...EDITING_CAPS,
  ...overrides,
});

/** A pixel-rectangle annotation, as Annotorious hands them to the editor. */
export const makeAnnotation = (id: string, meta: A9sWithMeta['_meta'] = {}): A9sWithMeta =>
  ({
    id,
    type: 'Annotation',
    target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:1,2,3,4' } },
    _meta: meta,
  }) as A9sWithMeta;

/** A fresh, untouched popup; `overrides.id` names the annotation too. */
export function makePopup(overrides: Partial<PopupRecord> = {}): PopupRecord {
  const id = overrides.id ?? 'local-uuid';
  return {
    id,
    annotation: makeAnnotation(id),
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

/** A described graph on image 1 by hand 100, allograph 10, with an empty polygon. */
export const makeGraph = (overrides: Partial<BackendGraph> = {}): BackendGraph =>
  ({
    id: 1,
    item_image: 1,
    annotation: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } },
    allograph: 10,
    hand: 100,
    graphcomponent_set: [],
    positions: [],
    ...overrides,
  }) as BackendGraph;

/** An unassigned 10×10 region on image 42, as the annotations endpoint returns it. */
export const makeBackendGraph = (
  id: number,
  annotationType: BackendGraph['annotation_type'] = 'image'
): BackendGraph =>
  ({
    id,
    item_image: 42,
    annotation_type: annotationType,
    allograph: null,
    hand: null,
    positions: [],
    position_details: [],
    graphcomponent_set: [],
    annotation: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 90],
            [0, 100],
            [10, 100],
            [10, 90],
            [0, 90],
          ],
        ],
      },
      properties: {},
    },
  }) as BackendGraph;
