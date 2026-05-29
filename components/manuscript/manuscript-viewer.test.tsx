/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The OpenSeadragon viewer is loaded via next/dynamic(ssr:false); stub it so the
// test doesn't pull in the real (canvas-heavy) annotorious module — but capture
// the props the viewer hands it, so tests can drive its events (exposeApi /
// onSelect / onCreate …) and exercise the viewer's wiring.
const { annotoriousPropsRef } = vi.hoisted(() => ({
  annotoriousPropsRef: { current: null as Record<string, (...args: unknown[]) => unknown> | null },
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicStub(props: Record<string, (...args: unknown[]) => unknown>) {
      annotoriousPropsRef.current = props;
      return null;
    },
}));

// A ViewerApi whose every method is a no-op (the select→popup path only reads
// popup state, not the viewer api).
const mockViewerApi = new Proxy({}, { get: () => () => undefined });

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: null, user: null, isReady: true, setToken: vi.fn(), logout: vi.fn() }),
}));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({
    config: {},
    loading: false,
    getLabel: (key: string) => key,
    getPluralLabel: (key: string) => key,
  }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isInCollection: () => false,
    clearCollection: vi.fn(),
  }),
}));

const fakeImage = {
  id: 4432,
  item_part: 268,
  iiif_image: 'http://iiif.test/x',
  locus: '1r',
};

const fakeManuscript = {
  current_item: { shelfmark: 'RRS i 34', repository: { name: 'NRS', place: 'Edinburgh' } },
  historical_item: { date_display: '1200' },
};

const fetchBaseData = vi.fn(async () => ({
  image: fakeImage,
  manuscript: fakeManuscript,
  allographs: [],
  imageHeight: 2000,
}));

vi.mock('@/lib/manuscript-viewer-data', () => ({
  fetchManuscriptViewerBaseData: (...args: unknown[]) => fetchBaseData(...(args as [])),
  fetchImageAllographIds: vi.fn(async () => []),
}));

vi.mock('@/lib/manuscript-viewer-annotations', () => ({
  buildInitialViewerAnnotations: vi.fn(async () => []),
}));

vi.mock('@/services/manuscripts', () => ({
  // fetchHands returns a paginated envelope; the viewer reads `.results`.
  fetchHands: vi.fn(async () => ({ results: [] })),
}));

vi.mock('@/services/image-texts', () => ({
  fetchImageTextsForImage: vi.fn(async () => []),
  linkRegionToElement: vi.fn(),
}));

import ManuscriptViewer from './manuscript-viewer';

// Full editing capabilities so the create/save/delete paths are active in tests.
const EDITING_CAPS = {
  canCreatePublicAnnotations: true,
  canPersistPublicAnnotations: true,
  canCreateEditorialAnnotations: true,
  canPersistEditorialAnnotations: true,
  canDeleteAnnotations: true,
  canModifyAnnotations: true,
  canViewEditorialControls: true,
  canUseSettings: true,
  canUseEditorSettings: true,
} as const;

const draftAnnotation = (id: string) => ({
  id,
  target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
  body: [],
  _meta: { annotationType: 'public' },
});

describe('ManuscriptViewer smoke test', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts past the loading state and renders the image-tools header control', async () => {
    render(<ManuscriptViewer imageId="4432" mode="public" />);
    // findBy* waits for the mocked base-data effect to resolve and the component
    // to re-render past its loading early-return.
    const imageTools = await screen.findByRole('button', { name: 'Image tools' });
    expect(imageTools).toBeTruthy();
    expect(fetchBaseData).toHaveBeenCalledTimes(1);
  });

  it('shows the error state when base data fails to load', async () => {
    fetchBaseData.mockRejectedValueOnce(new Error('boom'));
    render(<ManuscriptViewer imageId="4432" mode="public" />);
    expect(await screen.findByText('boom')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Try Again' })).toBeTruthy();
  });

  it('opens an annotation popup when the viewer fires onSelect (event→popup wiring)', async () => {
    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });

    // Drive the Annotorious events the viewer wired up.
    const props = annotoriousPropsRef.current;
    expect(props).toBeTruthy();

    // exposeApi → osdReady true + viewerApiRef set.
    act(() => {
      props!.exposeApi?.(mockViewerApi);
    });

    // No popup yet.
    expect(screen.queryByRole('dialog')).toBeNull();

    // onSelect a (draft) annotation → openSinglePopupFromAnnotation → a popup
    // card (role="dialog") renders.
    act(() => {
      props!.onSelect?.({
        id: 'draft-test-1',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
        body: [],
        _meta: { annotationType: 'public' },
      });
    });

    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('marks the editor dirty when the viewer fires onCreate (create→save wiring)', async () => {
    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    act(() => {
      props!.exposeApi?.(mockViewerApi);
    });

    // With editing capabilities the Save button renders but is disabled (clean).
    const saveBefore = await screen.findByRole('button', { name: 'Save (s)' });
    expect(saveBefore).toHaveProperty('disabled', true);

    // onCreate a new draft → handleViewerCreate → editorState.markCreated → dirty.
    await act(async () => {
      props!.onCreate?.(draftAnnotation('draft-created-1'));
    });

    const saveAfter = await screen.findByRole('button', { name: 'Save (s)' });
    expect(saveAfter).toHaveProperty('disabled', false);
  });
});
