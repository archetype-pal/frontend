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

describe('useImageTextLinking — tryLinkRegion (forward / phrase-armed flow)', () => {
  it('tags the drawn box annotationType:"text" on the canvas as it links', async () => {
    const viewerApi = makeViewerApi();
    const updateSpy = viewerApi.updateSelectedDraft as unknown as ReturnType<typeof vi.fn>;
    const { result } = renderHook(() => useImageTextLinking(makeArgs(viewerApi)));

    // Arm a phrase for linking (a phrase click in the text panel).
    act(() => {
      result.current.setLinkArm({ textId: 7, elementIndex: 3, label: 'β' });
    });

    // Draw a region while the phrase is armed → forward link. tryLinkRegion pushes
    // the TYPED box onto the canvas synchronously (before any await), which is what
    // keeps it visible in pure text view during the save round-trip now that the
    // filter gates the glyph layer purely on layer (`return false`), not on draft.
    let handled: boolean | undefined;
    act(() => {
      handled = result.current.tryLinkRegion(makeRegion('#draft-1'));
    });

    expect(handled).toBe(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((updateSpy.mock.calls[0][0] as A9sWithMeta)._meta?.annotationType).toBe('text');
    // The link request fires with the armed phrase's ids and the converted geometry.
    expect(linkRegionToElement).toHaveBeenCalledWith(
      'test-token',
      7,
      3,
      expect.objectContaining({ type: 'Feature' })
    );

    // Drain the async link continuation (removeAnnotationById + setLinkArm(null)).
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('is a no-op when no phrase is armed (returns false, draws nothing)', async () => {
    const viewerApi = makeViewerApi();
    const { result } = renderHook(() => useImageTextLinking(makeArgs(viewerApi)));

    let handled: boolean | undefined;
    act(() => {
      handled = result.current.tryLinkRegion(makeRegion('#draft-2'));
    });

    expect(handled).toBe(false);
    expect(viewerApi.updateSelectedDraft).not.toHaveBeenCalled();
    expect(linkRegionToElement).not.toHaveBeenCalled();

    // Let the mount effect's image-texts fetch settle.
    await act(async () => {
      await Promise.resolve();
    });
  });
});
