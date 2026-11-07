/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Allograph } from '@/types/allographs';
import type { BackendGraph } from '@/services/annotations';

// The OpenSeadragon viewer is loaded via next/dynamic(ssr:false); stub it so the
// test doesn't pull in the real (canvas-heavy) annotorious module — but capture
// the props the viewer hands it, so tests can drive its events (exposeApi /
// onSelect / onCreate …) and exercise the viewer's wiring.
const { annotoriousPropsRef, authRef, userRef, findOnPage, annotationServiceMocks } = vi.hoisted(
  () => ({
    annotoriousPropsRef: {
      current: null as Record<string, (...args: unknown[]) => unknown> | null,
    },
    authRef: { current: false },
    userRef: { current: null as { capabilities: Record<string, boolean> } | null },
    findOnPage: vi.fn(),
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
  })
);

function withQueryClient({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const glyphAssist = vi.hoisted(() => ({
  getAssistEnabled: vi.fn(async () => false),
  suggestShape: vi.fn(),
  rejectSuggestion: vi.fn(async () => ({ status: 'rejected' })),
  explainAnnotation: vi.fn(),
  getStoredExplanation: vi.fn(async () => null),
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
    user: userRef.current,
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

vi.mock('@/services/backoffice/annotation-proposals', () => ({ findOnPage }));

vi.mock('@/services/glyph-assist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/glyph-assist')>()),
  ...glyphAssist,
}));

vi.mock('@/services/image-texts', () => ({
  fetchImageTextsForImage: vi.fn(async () => []),
  linkRegionToElement: vi.fn(),
}));

import ManuscriptViewer from './manuscript-viewer';
import { buildInitialViewerAnnotations } from '@/lib/manuscript-viewer-annotations';
import { EDITING_CAPS } from '@/test/annotation-fixtures';

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
    userRef.current = null;
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

  it('offers the find-on-page control to managers only, searching this page', async () => {
    const capabilities = { annotate: true, annotate_editorially: true, read_drafts: true };
    authRef.current = true;
    userRef.current = { capabilities: { ...capabilities, manage: false } };
    const { unmount } = render(
      <ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />
    );
    await screen.findByRole('button', { name: 'Image tools' });
    expect(screen.queryByRole('button', { name: 'Find a letter on this page' })).toBeNull();
    unmount();

    userRef.current = { capabilities: { ...capabilities, manage: true } };
    findOnPage.mockResolvedValue({ status: 'cannot', reason: 'unknown_letter', options: [] });
    render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Find a letter on this page' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'What to find' }), {
      target: { value: 'long s' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    await waitFor(() => expect(findOnPage).toHaveBeenCalledWith('4432', { request: 'long s' }));
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

  describe('asking a model about a shape', () => {
    const draft = {
      id: 'draft-1',
      target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:10,20,30,40' } },
      body: [],
      _meta: { annotationType: 'image' },
    };
    const suggestion = {
      id: 77,
      allograph: allographA.id,
      allograph_label: 'a',
      hand: null,
      confidence: 0.8,
      components: [],
      positions: [],
      reasoning: 'A round bowl under a head.',
      alternatives: [],
      problem: '',
      model_name: 'claude-opus-5-5',
    };

    async function draftPopup() {
      glyphAssist.getAssistEnabled.mockResolvedValue(true);
      render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
      await screen.findByRole('button', { name: 'Image tools' });
      const props = annotoriousPropsRef.current;
      act(() => {
        props!.exposeApi?.(mockViewerApi);
        props!.onCreate?.(draft as never);
        props!.onSelect?.(draft as never);
      });
      await screen.findByRole('dialog');
    }

    beforeEach(() => {
      glyphAssist.suggestShape.mockReset().mockResolvedValue(suggestion);
      glyphAssist.rejectSuggestion.mockClear();
      glyphAssist.explainAnnotation.mockReset();
    });
    afterEach(() => glyphAssist.getAssistEnabled.mockResolvedValue(false));

    it('offers nothing when the model is switched off', async () => {
      glyphAssist.getAssistEnabled.mockResolvedValue(false);
      render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />);
      await screen.findByRole('button', { name: 'Image tools' });
      const props = annotoriousPropsRef.current;
      act(() => {
        props!.exposeApi?.(mockViewerApi);
        props!.onCreate?.(draft as never);
        props!.onSelect?.(draft as never);
      });
      await screen.findByRole('dialog');

      expect(screen.queryByRole('button', { name: 'Suggest with AI' })).toBeNull();
    });

    it('fills the draft from the suggestion, to accept or reject', async () => {
      await draftPopup();

      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));

      expect(await screen.findByText('A round bowl under a head.')).toBeTruthy();
      expect(glyphAssist.suggestShape).toHaveBeenCalledWith(
        4432,
        expect.objectContaining({ allograph: null, language: 'en' })
      );
      expect(screen.getByText('Suggested: a')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
    });

    it('offers nothing to accept when the model named no letter', async () => {
      glyphAssist.suggestShape.mockResolvedValue({
        ...suggestion,
        allograph: null,
        allograph_label: '',
        problem: 'The box holds two lines of writing.',
      });
      await draftPopup();

      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));

      expect(await screen.findByText('The box holds two lines of writing.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy();
    });

    it('closes the suggestion as rejected when the draft is rejected', async () => {
      await draftPopup();
      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));

      fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

      await waitFor(() => expect(glyphAssist.rejectSuggestion).toHaveBeenCalledWith(77));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('turns the suggestion down when the draft is closed with the X', async () => {
      await draftPopup();
      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));
      await screen.findByRole('button', { name: 'Accept' });

      fireEvent.click(screen.getByRole('button', { name: 'Close annotation popup' }));

      await waitFor(() => expect(glyphAssist.rejectSuggestion).toHaveBeenCalledWith(77));
    });

    it('turns down an answer that arrives after the draft was discarded', async () => {
      let answer: (value: typeof suggestion) => void = () => undefined;
      glyphAssist.suggestShape.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      await draftPopup();

      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));
      expect(screen.getByRole('button', { name: 'OK' })).toHaveProperty('disabled', true);
      fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await act(async () => answer(suggestion));

      await waitFor(() => expect(glyphAssist.rejectSuggestion).toHaveBeenCalledWith(77));
    });

    it('says why when the model cannot answer, and leaves the draft as it was', async () => {
      const { GlyphAssistError } =
        await vi.importActual<typeof import('@/services/glyph-assist')>('@/services/glyph-assist');
      glyphAssist.suggestShape.mockRejectedValue(new GlyphAssistError(429, 'Try again tomorrow.'));
      await draftPopup();

      fireEvent.click(await screen.findByRole('button', { name: 'Suggest with AI' }));

      expect(await screen.findByText('Try again tomorrow.')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    it('explains a saved annotation in its own tab', async () => {
      glyphAssist.getAssistEnabled.mockResolvedValue(true);
      glyphAssist.explainAnnotation.mockResolvedValue({
        id: 1,
        graph: 12,
        language: 'en',
        verdict: 'disagree',
        summary: 'The shape looks more like a c.',
        reasons: [
          { basis: 'form', text: 'The head is open.' },
          { basis: 'practice', text: 'Scribes of the time closed it.' },
        ],
        doubts: ['The ink is faint.'],
        alternative: { allograph: 9, label: 'c' },
        model_name: 'claude-opus-5-5',
        created: '2026-11-07T00:00:00Z',
      });
      render(<ManuscriptViewer imageId="4432" mode="editor" capabilities={EDITING_CAPS} />, {
        wrapper: withQueryClient,
      });
      await screen.findByRole('button', { name: 'Image tools' });
      await waitFor(() => expect(glyphAssist.getAssistEnabled).toHaveBeenCalled());
      const props = annotoriousPropsRef.current;
      act(() => {
        props!.exposeApi?.(mockViewerApi);
        props!.onSelect?.({
          id: 'db:12',
          target: { selector: { type: 'FragmentSelector', value: 'xywh=pixel:0,0,10,10' } },
          body: [],
          _meta: { annotationType: 'image', allographId: allographA.id },
        });
      });
      await screen.findByRole('dialog');

      fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Explain' }), {
        button: 0,
        ctrlKey: false,
      });
      fireEvent.click(await screen.findByRole('button', { name: 'Explain this annotation' }));

      expect(await screen.findByText('The shape looks more like a c.')).toBeTruthy();
      expect(glyphAssist.explainAnnotation).toHaveBeenCalledWith(12, 'en');
      expect(screen.getByText('The model would read this shape as c.')).toBeTruthy();
      expect(screen.getByText('How scribes wrote at the time')).toBeTruthy();
      expect(
        screen.getByText("From the model's general knowledge, not from this corpus.")
      ).toBeTruthy();
      expect(screen.getByText('The ink is faint.')).toBeTruthy();
    });
  });
});
