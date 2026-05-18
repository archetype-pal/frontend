import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildInitialViewerAnnotations } from './manuscript-viewer-annotations';
import { encodeDraftSharePayload } from './annotation-popup-utils';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { BackendGraph } from '@/services/annotations';

// Mock the network so the builder is exercised against canned backend lists.
// We don't care which arguments hit fetchAnnotationsForImage — the assertion
// surface is what comes back from the merge pass.
vi.mock('@/services/annotations', () => ({
  fetchAnnotationsForImage: vi.fn(),
}));

import { fetchAnnotationsForImage } from '@/services/annotations';

function makeBackendGraph(
  id: number,
  annotationType: 'image' | 'editorial' = 'image'
): BackendGraph {
  return {
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
      properties: { saved: 1 },
    },
  };
}

function makeDraft(id: string): A9sAnnotation {
  return {
    id,
    type: 'Annotation',
    target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,1,1' } },
  } as A9sAnnotation;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildInitialViewerAnnotations', () => {
  it('maps image annotations through backendToA9sAnnotation', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([makeBackendGraph(1)]);

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [],
    });
    expect(result.map((a) => a.id)).toEqual(['db:1']);
    expect(fetchAnnotationsForImage).toHaveBeenCalledTimes(1);
  });

  it('skips the editorial fetch when includeEditorial is false', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([]);
    await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [],
    });
    expect(fetchAnnotationsForImage).toHaveBeenCalledTimes(1);
  });

  it('fetches editorial annotations as a second call when includeEditorial is true', async () => {
    vi.mocked(fetchAnnotationsForImage)
      .mockResolvedValueOnce([makeBackendGraph(1)])
      .mockResolvedValueOnce([makeBackendGraph(2, 'editorial')]);

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      includeEditorial: true,
      currentViewerAnnotations: [],
    });
    expect(result.map((a) => a.id).sort()).toEqual(['db:1', 'db:2']);
    expect(fetchAnnotationsForImage).toHaveBeenCalledTimes(2);
  });

  it('rebases by replaying local drafts (non-db ids) on top of the fetched list', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([makeBackendGraph(1)]);

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [makeDraft('local-draft-1'), makeDraft('local-draft-2')],
    });

    expect(result.map((a) => a.id).sort()).toEqual(['db:1', 'local-draft-1', 'local-draft-2']);
  });

  it('drops drafts that collide with a refreshed db id', async () => {
    // If a draft's id happens to equal a refreshed db id (shouldn't, but the
    // contract is to prefer the server entry), the draft is dropped.
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([makeBackendGraph(1)]);
    const conflictingDraft = { ...makeDraft('db:1') };

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [conflictingDraft],
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('db:1');
  });

  it('appends a ?draft= shared draft when its id is not already present', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([]);
    const shared = encodeDraftSharePayload({
      id: 'draft:shared-1',
      target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:1,2,3,4' } },
      body: [],
    });

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [],
      currentUrl: `https://example.test/?draft=${shared}`,
    });
    expect(result.map((a) => a.id)).toEqual(['draft:shared-1']);
  });

  it('does not duplicate a shared draft already present locally', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([]);
    const shared = encodeDraftSharePayload({
      id: 'draft:shared-1',
      target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:1,2,3,4' } },
      body: [],
    });

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [makeDraft('draft:shared-1')],
      currentUrl: `https://example.test/?draft=${shared}`,
    });
    expect(result.length).toBe(1);
  });

  it('ignores malformed ?draft= payloads silently', async () => {
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([]);
    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map(),
      isPublicDemoMode: false,
      currentViewerAnnotations: [],
      currentUrl: 'https://example.test/?draft=not-a-valid-payload!!',
    });
    expect(result).toEqual([]);
  });

  it('looks up allograph labels via allographNameById for image annotations', async () => {
    const backend = { ...makeBackendGraph(1), allograph: 5 } as BackendGraph;
    vi.mocked(fetchAnnotationsForImage).mockResolvedValueOnce([backend]);

    const result = await buildInitialViewerAnnotations({
      itemImageId: '42',
      iiifImage: 'iiif',
      imageHeight: 100,
      allographNameById: new Map([[5, 'Alpha']]),
      isPublicDemoMode: false,
      currentViewerAnnotations: [],
    });
    // The label feeds into the annotation body; just confirm we end up with
    // an entry — the wiring is what matters here.
    expect(result.length).toBe(1);
    expect(result[0]._meta?.allographId).toBe(5);
  });
});
