/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Allograph } from '@/types/allographs';
import type { BackendGraph } from '@/services/annotations';
import type { ImageTextDetail } from '@/services/image-texts';
import type { ViewerCapabilities } from '@/types/annotation-viewer';

// The OpenSeadragon viewer is loaded via next/dynamic(ssr:false); stub it so the
// test doesn't pull in the real (canvas-heavy) annotorious module — but capture
// the props the viewer hands it, so tests can drive its events (exposeApi /
// onSelect / onCreate …) and exercise the viewer's wiring.
const { annotoriousPropsRef, authRef, annotationServiceMocks } = vi.hoisted(() => ({
  annotoriousPropsRef: { current: null as Record<string, (...args: unknown[]) => unknown> | null },
  authRef: { current: false },
  annotationServiceMocks: {
    fetchAnnotationsForImage: vi.fn(
      async (
        _imageId?: string,
        _allographId?: string,
        _annotationType?: string | null,
        _authenticated?: boolean
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
    isAuthenticated: authRef.current,
    user: null,
    isReady: true,
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    items: [],
    collections: [{ id: 'default', name: 'Collection', items: [] }],
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

vi.mock('@/lib/manuscript-viewer-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/manuscript-viewer-data')>();

  return {
    ...actual,
    fetchManuscriptViewerBaseData: (...args: unknown[]) => fetchBaseData(...(args as [])),
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
import { fetchImageTextsForImage } from '@/services/image-texts';
import { EDITING_CAPS, makeCaps } from '@/test/annotation-fixtures';

// Full editing capabilities so the create/save/delete paths are active in tests.

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

/** A saved image annotation; the header picker offers the allographs these carry. */
const savedImageAnnotation = (id: string, allographId?: number, x = 0) => ({
  id,
  target: { selector: { type: 'FragmentSelector', value: `xywh=pixel:${x},${x},10,10` } },
  _meta: { annotationType: 'image', allographId },
});

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
    authRef.current = false;
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

  it('resets the view and reloads the saved annotations when Reset view is clicked', async () => {
    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    const props = annotoriousPropsRef.current;
    const goHome = vi.fn();
    const api = new Proxy(
      { goHome },
      {
        get: (target, prop) =>
          prop in target ? target[prop as keyof typeof target] : () => undefined,
      }
    );
    act(() => {
      props!.exposeApi?.(api);
    });

    await act(async () => {
      props!.onCreate?.(draftAnnotation('draft-before-reset'));
    });
    expect(await screen.findByRole('button', { name: 'Save (s)' })).toHaveProperty(
      'disabled',
      false
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(goHome).toHaveBeenCalledTimes(1);
    // The unsaved draft is dropped in favour of the saved annotations.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save (s)' })).toHaveProperty('disabled', true)
    );
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
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([
      savedImageAnnotation('db:image-a', allographA.id),
    ] as never);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });

    fireEvent.click(await screen.findByRole('combobox'));
    expect(await screen.findByText('a, Caroline')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('b, Anglicana')).toBeNull());
    // The picker's allographs come from the loaded annotations, not a second fetch.
    expect(annotationServiceMocks.fetchAnnotationsForImage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('a, Caroline'));
    const eyeButton = await screen.findByRole('button', {
      name: 'View a, Caroline annotation thumbnails',
    });
    fireEvent.click(eyeButton);

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Allograph: a, Caroline')).toBeTruthy();
  });

  it('keeps the header allograph picker empty without filtering annotations when no saved graph has an allograph', async () => {
    const imageAnnotation = savedImageAnnotation('db:image-a');

    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([imageAnnotation] as never);

    render(<ManuscriptViewer imageId="4432" mode="public" />);
    await screen.findByRole('button', { name: 'Image tools' });
    await waitFor(() => expect(annotoriousPropsRef.current?.annotationFilter).toBeTruthy());

    expect(screen.queryByRole('combobox')).toBeNull();

    const props = annotoriousPropsRef.current;
    const annotationFilter = props?.annotationFilter as
      ((annotation: typeof imageAnnotation) => boolean) | undefined;
    expect(annotationFilter?.(imageAnnotation)).toBe(true);
  });

  it('adds a newly saved annotation allograph to the image-scoped header dropdown without reload', async () => {
    authRef.current = true;
    fetchBaseData.mockResolvedValueOnce({
      image: fakeImage,
      manuscript: fakeManuscript,
      allographs: [allographA, allographB],
      imageHeight: 2000,
    });
    vi.mocked(buildInitialViewerAnnotations).mockResolvedValueOnce([
      savedImageAnnotation('db:101', allographA.id),
    ] as never);
    annotationServiceMocks.fetchAnnotationsForImage.mockImplementation(
      async (_imageId, _allograph, type) =>
        type === 'image' ? [backendGraph(101, allographA.id), backendGraph(102, allographB.id)] : []
    );

    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    await screen.findByRole('button', { name: 'Image tools' });

    fireEvent.click(await screen.findByRole('combobox'));
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

    fireEvent.click(await screen.findByRole('combobox'));
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

    fireEvent.click(await screen.findByRole('combobox'));
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

  describe('text panel', () => {
    const transcription: ImageTextDetail = {
      id: 7,
      item_image: fakeImage.id,
      type: 'Transcription',
      content: '<p>Willelmus rex</p>',
      status: 'Live',
      language: 'la',
      created: '2026-01-01T00:00:00Z',
      modified: '2026-01-01T00:00:00Z',
    };

    const renderWithText = (capabilities: ViewerCapabilities) => {
      localStorage.setItem('annotationViewerSettings', JSON.stringify({ viewMode: 'text' }));
      vi.mocked(fetchImageTextsForImage).mockResolvedValue([transcription]);
      render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={capabilities} />);
    };

    const pressKeysWithSpyApi = async (keys: string[], spies: Record<string, () => void>) => {
      const exposeApi = annotoriousPropsRef.current?.exposeApi;
      expect(exposeApi).toBeDefined();
      const enablePan = vi.fn();
      const api = new Proxy<Record<string, () => void>>(
        { ...spies, enablePan },
        { get: (target, prop) => (typeof prop === 'string' && target[prop]) || (() => undefined) }
      );
      act(() => {
        exposeApi!(api);
      });
      const panCalls = enablePan.mock.calls.length;

      keys.forEach((key) => fireEvent.keyDown(window, { key }));
      fireEvent.keyDown(window, { key: 'g' });
      await waitFor(() => expect(enablePan.mock.calls.length).toBeGreaterThan(panCalls));
    };

    afterEach(() => {
      localStorage.clear();
      vi.mocked(fetchImageTextsForImage).mockResolvedValue([]);
    });

    it('shows the text read only to a user who may annotate but not manage', async () => {
      renderWithText(makeCaps({ canEditTexts: false }));

      expect(await screen.findByText('Willelmus rex')).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Download Transcription as TEI' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Open in the full editor' })).toBeNull();
    });

    it('offers the full editor and region drawing to a user who may manage', async () => {
      renderWithText(EDITING_CAPS);

      expect(await screen.findByRole('link', { name: 'Open in the full editor' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Draw region to link (d / space)' })).toBeTruthy();
    });

    it('offers no region drawing to a user who may annotate but not manage', async () => {
      renderWithText(makeCaps({ canEditTexts: false }));
      await screen.findByText('Willelmus rex');

      expect(screen.queryByRole('button', { name: 'Draw region to link (d / space)' })).toBeNull();

      const enableDraw = vi.fn();
      await pressKeysWithSpyApi(['d', ' '], { enableDraw });
      expect(enableDraw).not.toHaveBeenCalled();
    });

    it('drops a Draw armed before the texts load once the view turns to Text', async () => {
      localStorage.setItem('annotationViewerSettings', JSON.stringify({ viewMode: 'text' }));
      let showTexts: (texts: ImageTextDetail[]) => void = () => undefined;
      vi.mocked(fetchImageTextsForImage).mockReturnValue(
        new Promise((resolve) => {
          showTexts = resolve;
        })
      );
      render(
        <ManuscriptViewer
          imageId="4432"
          mode="editor"
          capabilities={makeCaps({ canEditTexts: false })}
        />
      );
      await screen.findByRole('button', { name: 'Draw (d / space)' });

      const enablePan = vi.fn();
      const enableDraw = vi.fn();
      const api = new Proxy<Record<string, () => void>>(
        { enablePan, enableDraw },
        { get: (target, prop) => (typeof prop === 'string' && target[prop]) || (() => undefined) }
      );
      act(() => {
        annotoriousPropsRef.current!.exposeApi!(api);
      });
      fireEvent.keyDown(window, { key: 'd' });
      await waitFor(() => expect(enableDraw).toHaveBeenCalledTimes(1));
      const panCalls = enablePan.mock.calls.length;

      act(() => showTexts([transcription]));
      await screen.findByText('Willelmus rex');

      await waitFor(() => expect(enablePan.mock.calls.length).toBeGreaterThan(panCalls));
    });
  });

  it('keeps drawing outside Text view for a user who may annotate but not manage', async () => {
    render(
      <ManuscriptViewer
        imageId="4432"
        mode="editor"
        capabilities={makeCaps({ canEditTexts: false })}
      />
    );

    expect(await screen.findByRole('button', { name: 'Draw (d / space)' })).toBeTruthy();
  });
});
