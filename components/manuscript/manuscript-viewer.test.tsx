/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Allograph } from '@/types/allographs';
import type { BackendGraph } from '@/services/annotations';

// The OpenSeadragon viewer is loaded via next/dynamic(ssr:false); stub it so the
// test doesn't pull in the real (canvas-heavy) annotorious module — but capture
// the props the viewer hands it, so tests can drive its events (exposeApi /
// onSelect / onCreate …) and exercise the viewer's wiring.
const { annotoriousPropsRef, authTokenRef, annotationServiceMocks } = vi.hoisted(() => ({
  annotoriousPropsRef: { current: null as Record<string, (...args: unknown[]) => unknown> | null },
  authTokenRef: { current: null as string | null },
  annotationServiceMocks: {
    fetchAnnotationsForImage: vi.fn(
      async (
        _imageId?: string,
        _allographId?: string,
        _annotationType?: string | null,
        _token?: string | null
      ): Promise<BackendGraph[]> => []
    ),
    createViewerAnnotation: vi.fn(async () => ({})),
    updateViewerAnnotation: vi.fn(async () => ({})),
    deleteViewerAnnotation: vi.fn(async () => undefined),
  },
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
  useAuth: () => ({
    token: authTokenRef.current,
    user: null,
    isReady: true,
    setToken: vi.fn(),
    logout: vi.fn(),
  }),
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
    collections: [{ id: 'default', name: 'Collection', items: [] }],
    canManageCollections: true,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isInCollection: () => false,
    clearCollection: vi.fn(),
    createCollection: vi.fn(() => true),
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
  allographs: [] as Allograph[],
  imageHeight: 2000,
}));
const fetchImageAllographIds = vi.fn(async () => [] as number[]);

vi.mock('@/lib/manuscript-viewer-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/manuscript-viewer-data')>();

  return {
    ...actual,
    fetchManuscriptViewerBaseData: (...args: unknown[]) => fetchBaseData(...(args as [])),
    fetchImageAllographIds: (...args: unknown[]) => fetchImageAllographIds(...(args as [])),
  };
});

vi.mock('@/lib/manuscript-viewer-annotations', () => ({
  buildInitialViewerAnnotations: vi.fn(async () => []),
}));

vi.mock('@/services/manuscripts', () => ({
  // fetchHands returns a paginated envelope; the viewer reads `.results`.
  fetchHands: vi.fn(async () => ({ results: [] })),
}));

vi.mock('@/services/annotations', () => annotationServiceMocks);

vi.mock('@/services/image-texts', () => ({
  fetchImageTextsForImage: vi.fn(async () => []),
  linkRegionToElement: vi.fn(),
}));

import ManuscriptViewer from './manuscript-viewer';
import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';

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

const allographA = {
  id: 1,
  character_name: 'a',
  name: 'Caroline',
  components: [],
  positions: [],
};

const allographB = {
  id: 2,
  character_name: 'b',
  name: 'Anglicana',
  components: [],
  positions: [],
};

function backendGraph(id: number, allographId: number): BackendGraph {
  return {
    id,
    item_image: fakeImage.id,
    annotation_type: 'image',
    allograph: allographId,
    hand: 10,
    annotation: {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 1990],
            [0, 2000],
            [10, 2000],
            [10, 1990],
            [0, 1990],
          ],
        ],
      },
      properties: {},
    },
    graphcomponent_set: [],
    positions: [],
    note: '',
    internal_note: '',
  };
}

describe('ManuscriptViewer smoke test', () => {
  afterEach(() => {
    vi.clearAllMocks();
    authTokenRef.current = null;
    annotationServiceMocks.fetchAnnotationsForImage.mockResolvedValue([]);
    annotationServiceMocks.createViewerAnnotation.mockResolvedValue({});
    annotationServiceMocks.updateViewerAnnotation.mockResolvedValue({});
    annotationServiceMocks.deleteViewerAnnotation.mockResolvedValue(undefined);
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
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
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

  it('does not open a glyph popup when the viewer selects a text region', async () => {
    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    expect(props).toBeTruthy();

    act(() => {
      props!.exposeApi?.(mockViewerApi);
      props!.onSelect?.({
        id: 'db:12',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
        _meta: { annotationType: 'text', allographId: allographA.id },
      });
    });

    expect(screen.queryByRole('dialog')).toBeNull();
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

  it('toggles between select/drag and public draw tools when Space is pressed', async () => {
    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    const enablePan = vi.fn();
    const enableDraw = vi.fn();
    // Track pan/draw, but no-op every other method the viewer's mount effects
    // call (setImageAdjustments, toggleAnnotations, …) so they don't throw.
    const api = new Proxy(
      { enablePan, enableDraw },
      {
        get: (target, prop) =>
          prop in target ? target[prop as keyof typeof target] : () => undefined,
      }
    );
    act(() => {
      props!.exposeApi?.(api);
    });
    expect(enablePan).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: ' ' });
    await waitFor(() => expect(enableDraw).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(window, { key: ' ' });
    await waitFor(() => expect(enablePan).toHaveBeenCalledTimes(2));
  });

  it('uses plain s to immediately save an edited active popup', async () => {
    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    act(() => {
      props!.exposeApi?.(mockViewerApi);
      props!.onSelect?.({
        id: 'db:12',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
        body: [],
        _meta: { annotationType: 'image', note: 'before' },
      });
    });

    expect(await screen.findByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Notes' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.change(await screen.findByPlaceholderText('Type note'), {
      target: { value: 'after' },
    });
    expect(screen.getByRole('button', { name: 'Save Annotation' })).toHaveProperty(
      'disabled',
      false
    );

    fireEvent.keyDown(window, { key: 's' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens the allograph thumbnail gallery from an image-scoped header selection', async () => {
    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    fetchImageAllographIds.mockResolvedValueOnce([allographA.id]);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });
    await waitFor(() => expect(fetchImageAllographIds).toHaveBeenCalledWith('4432'));

    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText('a, Caroline')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('b, Anglicana')).toBeNull());

    fireEvent.click(screen.getByText('a, Caroline'));
    const eyeButton = await screen.findByRole('button', {
      name: 'View a, Caroline annotation thumbnails',
    });
    fireEvent.click(eyeButton);

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Allograph: a, Caroline')).toBeTruthy();
  });

  it('keeps the header allograph picker empty without filtering annotations when image ids are empty', async () => {
    const imageAnnotation = {
      id: 'db:image-a',
      target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
      _meta: { annotationType: 'image', allographId: allographA.id },
    };

    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    fetchImageAllographIds.mockResolvedValueOnce([]);
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([imageAnnotation] as never);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });
    await waitFor(() => expect(fetchImageAllographIds).toHaveBeenCalledWith('4432'));

    expect(screen.queryByRole('combobox')).toBeNull();

    const props = annotoriousPropsRef.current;
    const annotationFilter = props?.annotationFilter as
      ((annotation: typeof imageAnnotation) => boolean) | undefined;
    expect(annotationFilter?.(imageAnnotation)).toBe(true);
  });

  it('adds a newly saved annotation allograph to the image-scoped header dropdown without reload', async () => {
    authTokenRef.current = 'token';
    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    fetchImageAllographIds.mockResolvedValueOnce([allographA.id]);
    annotationServiceMocks.fetchAnnotationsForImage.mockImplementation(
      async (_imageId, _allograph, type) =>
        type === 'image' ? [backendGraph(101, allographA.id), backendGraph(102, allographB.id)] : []
    );

    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText('a, Caroline')).toBeTruthy();
    expect(screen.queryByText('b, Anglicana')).toBeNull();

    const props = annotoriousPropsRef.current;
    expect(props).toBeTruthy();

    const replaceAnnotations = vi.fn();
    const api = new Proxy(
      { replaceAnnotations },
      {
        get: (target, prop) =>
          prop in target ? target[prop as keyof typeof target] : () => undefined,
      }
    );
    act(() => {
      props!.exposeApi?.(api);
    });

    await act(async () => {
      props!.onCreate?.({
        ...draftAnnotation('draft-created-b'),
        _meta: {
          annotationType: 'public',
          allographId: allographB.id,
          handId: 10,
        },
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Save (s)' }));

    await waitFor(() =>
      expect(annotationServiceMocks.createViewerAnnotation).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          allograph: allographB.id,
          hand: 10,
          item_image: fakeImage.id,
        })
      )
    );

    expect(await screen.findByText('b, Anglicana')).toBeTruthy();
    expect(replaceAnnotations).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'db:101',
        _meta: expect.objectContaining({ allographId: allographA.id }),
      }),
      expect.objectContaining({
        id: 'db:102',
        _meta: expect.objectContaining({ allographId: allographB.id }),
      }),
    ]);
  });

  it('clears the allograph eye context when the dropdown returns to any allograph', async () => {
    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    fetchImageAllographIds.mockResolvedValueOnce([allographA.id, allographB.id]);
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([
      {
        id: 'db:image-a',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
        _meta: { annotationType: 'image', allographId: allographA.id },
      },
      {
        id: 'db:image-b',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:10,10,10,10' } },
        _meta: { annotationType: 'image', allographId: allographB.id },
      },
    ] as never);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    act(() => {
      props!.onSelect?.({
        id: 'db:image-b',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:10,10,10,10' } },
        _meta: { annotationType: 'image', allographId: allographB.id },
      });
    });
    expect(await screen.findByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('combobox'));
    const carolineOption = await screen.findByText('a, Caroline');
    fireEvent.mouseEnter(carolineOption.closest('[cmdk-item]') ?? carolineOption);
    fireEvent.click(carolineOption);
    expect(
      await screen.findByRole('button', { name: 'View a, Caroline annotation thumbnails' })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('combobox'));
    const anyOption = await screen.findByText('Any allograph');
    fireEvent.mouseEnter(anyOption.closest('[cmdk-item]') ?? anyOption);
    fireEvent.click(anyOption);

    const eyeButton = await screen.findByRole('button', { name: 'Select an allograph first' });
    expect(eyeButton).toHaveProperty('disabled', true);
    expect(eyeButton.textContent).toBe('0');
    expect(
      screen.queryByRole('button', { name: 'View b, Anglicana annotation thumbnails' })
    ).toBeNull();
  });

  it('excludes text regions from the allograph eye count and thumbnail gallery', async () => {
    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA],
      imageHeight: 2000,
    });
    fetchImageAllographIds.mockResolvedValueOnce([allographA.id]);
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([
      {
        id: 'db:image-1',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
        _meta: { annotationType: 'image', allographId: allographA.id },
      },
      {
        id: 'db:text-1',
        target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:10,10,10,10' } },
        _meta: { annotationType: 'text', allographId: allographA.id },
      },
    ] as never);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText('a, Caroline'));

    const eyeButton = await screen.findByRole('button', {
      name: 'View a, Caroline annotation thumbnails',
    });
    expect(eyeButton.textContent).toBe('1');

    fireEvent.click(eyeButton);
    expect(
      await screen.findByRole('img', { name: 'Annotation thumbnail: db:image-1' })
    ).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Annotation thumbnail: db:text-1' })).toBeNull();
  });
});
