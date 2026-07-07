import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toTextRegionDraft, useImageTextLinking } from './use-image-text-linking';
import type {
  Annotation as A9sAnnotation,
  ViewerApi,
} from '@/components/manuscript/manuscript-annotorious';
import type { A9sWithMeta } from '@/types/annotation-viewer';

vi.mock('@/services/image-texts', () => ({
  fetchImageTextsForImage: vi.fn().mockResolvedValue([]),
  linkRegionToElement: vi.fn().mockResolvedValue(undefined),
  unlinkRegion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/ui/action-toast', () => ({
  showActionNotification: vi.fn(),
}));

import { linkRegionToElement } from '@/services/image-texts';

type Args = Parameters<typeof useImageTextLinking>[0];

function makeRegion(id: string): A9sAnnotation {
  return {
    id,
    type: 'Annotation',
    target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:10,20,30,40' } },
    _meta: {},
  } as A9sAnnotation;
}

function makeViewerApi() {
  return {
    updateSelectedDraft: vi.fn().mockResolvedValue(undefined),
    removeAnnotationById: vi.fn(),
    getAnnotations: vi.fn().mockReturnValue([]),
  } as unknown as ViewerApi;
}

function makeArgs(viewerApi: ViewerApi, overrides: Partial<Args> = {}): Args {
  return {
    imageId: '49',
    token: 'test-token',
    manuscriptImage: null, // keeps reloadTextsAndAnnotations a no-op after the link
    imageHeight: 1000,
    allographNameById: new Map(),
    isPublicDemoMode: false,
    canViewEditorialControls: true,
    viewerApiRef: { current: viewerApi },
    resetEditorFrom: vi.fn(),
    setInitialA9sAnnots: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('toTextRegionDraft', () => {
  it('tags a drawn box as the text layer without touching its geometry or id', () => {
    const region = makeRegion('#draft-1');
    const typed = toTextRegionDraft(region) as A9sWithMeta;
    expect(typed._meta?.annotationType).toBe('text');
    expect(typed.id).toBe('#draft-1');
    expect(typed.target).toEqual(region.target);
  });
});

describe('useImageTextLinking — live link paths', () => {
  it('linkExistingRegionToElement links a selected region by graph id (graph_id path)', async () => {
    const viewerApi = makeViewerApi();
    const { result } = renderHook(() => useImageTextLinking(makeArgs(viewerApi)));

    // The Link Bar path: link the region selected on the image to a phrase. It
    // passes the graph id directly (no armed state), so geometry is undefined and
    // the graph id is the 5th argument.
    act(() => {
      result.current.linkExistingRegionToElement(7, 3, 23041, 'β');
    });

    expect(linkRegionToElement).toHaveBeenCalledWith('test-token', 7, 3, undefined, 23041);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('linkPendingToPhrase links a drawn region to the clicked phrase with its geometry', async () => {
    const viewerApi = makeViewerApi();
    const { result } = renderHook(() => useImageTextLinking(makeArgs(viewerApi)));

    // Reverse flow: draw a region first (held pending), then click a phrase. The
    // request carries the converted geometry (new region), not a graph id.
    act(() => {
      result.current.startPendingLink(makeRegion('#draft-1'));
    });
    act(() => {
      result.current.linkPendingToPhrase(7, 3, 'β');
    });

    expect(linkRegionToElement).toHaveBeenCalledWith(
      'test-token',
      7,
      3,
      expect.objectContaining({ type: 'Feature' })
    );

    await act(async () => {
      await Promise.resolve();
    });
  });
});
