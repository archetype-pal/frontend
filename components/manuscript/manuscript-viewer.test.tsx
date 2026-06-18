/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Allograph } from '@/types/allographs';

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

vi.mock('@/lib/manuscript-viewer-data', () => ({
  fetchManuscriptViewerBaseData: (...args: unknown[]) => fetchBaseData(...(args as [])),
  fetchImageAllographIds: (...args: unknown[]) => fetchImageAllographIds(...(args as [])),
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

describe('ManuscriptViewer smoke test', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ width: 1000, height: 2000 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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
