/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandDetail, HandImage, HandManuscript } from '@/types/hand-detail';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { getDefaultConfig } from '@/lib/site-features';
import { HandViewer } from './hand-viewer';

const { addItem, apiFetch, downloadCsv, nav, thumbSize, GRAPHS, ALLOGRAPHS } = vi.hoisted(() => {
  const annotation = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [10, 20],
          [30, 20],
          [30, 40],
          [10, 40],
        ],
      ],
    },
  };
  const graph = {
    item_image: 42,
    item_part: 22,
    annotation_type: 'image',
    annotation,
    hand: 5,
    graphcomponent_set: [],
    positions: [],
  };
  return {
    addItem: vi.fn(),
    apiFetch: vi.fn(),
    downloadCsv: vi.fn(),
    nav: { search: 'tab=graphs' },
    thumbSize: vi.fn(),
    GRAPHS: [
      { ...graph, id: 101, allograph: 11 },
      { ...graph, id: 102, allograph: 12 },
    ],
    ALLOGRAPHS: [
      { id: 11, name: 'Insular', character_name: 'a', components: [], positions: [] },
      { id: 12, name: 'Caroline', character_name: 'b', components: [], positions: [] },
    ],
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/hands/5',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/lib/api-fetch', () => ({ apiFetch }));

function respond(url: string) {
  return { ok: true, json: async () => (url.includes('/graphs/') ? GRAPHS : ALLOGRAPHS) };
}

// Browsers save the file; jsdom has no URL.createObjectURL, so only the hand off is checked.
vi.mock('@/lib/graph-csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graph-csv')>()),
  downloadCsv,
}));

vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnail: (infoUrl: string, _coordinates: string, maxSize?: number) => {
    thumbSize(maxSize);
    return { src: infoUrl ? 'https://example.test/crop.jpg' : null, failed: false };
  },
}));

// Whether thumbnails count as near the screen, where they look up their crop.
const view = vi.hoisted(() => ({ near: true }));
vi.mock('@/hooks/use-in-view', () => ({ useInView: () => view.near }));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    addItem,
    removeItem: vi.fn(),
    isInCollection: () => false,
    isHydrated: true,
  }),
}));

vi.mock('@/components/common/backoffice-link', () => ({
  BackofficeLink: () => null,
}));

const HAND = {
  id: 5,
  name: 'Main Hand',
  scribe: null,
  item_part: 22,
  date: null,
  place: null,
  descriptions: [],
} as HandDetail;

const IMAGES: HandImage[] = [
  {
    id: 42,
    iiif_image: 'https://example.test/iiif/face.jp2',
    locus: 'face',
    number_of_annotations: 2,
    item_part: 22,
  },
];

const MANUSCRIPT: HandManuscript = { id: 22, display_label: 'Cotton Ch. 1' };

// A thumbnail's select toggle, named after its graph; never a group's "Select all".
const TOGGLE = /^Select .+ graph \d+$/;

function viewer() {
  return (
    <SiteFeaturesProvider initialConfig={getDefaultConfig()}>
      <HandViewer hand={HAND} images={IMAGES} scribe={null} manuscript={MANUSCRIPT} />
    </SiteFeaturesProvider>
  );
}

function renderGraphsTab() {
  return render(viewer());
}

describe('HandViewer Graphs tab', () => {
  beforeEach(() => {
    addItem.mockClear();
    downloadCsv.mockClear();
    thumbSize.mockClear();
    window.localStorage.clear();
    nav.search = 'tab=graphs';
    view.near = true;
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (url: string) => respond(url));
  });

  it('links each graph to its place on the image viewer, named by allograph and id', async () => {
    renderGraphsTab();

    const first = await screen.findByRole('link', {
      name: 'a, Insular, graph 101, open in the image viewer',
    });
    const second = screen.getByRole('link', {
      name: 'b, Caroline, graph 102, open in the image viewer',
    });

    expect(first.getAttribute('href')).toBe('/manuscripts/22/images/42?graph=101');
    expect(second.getAttribute('href')).toBe('/manuscripts/22/images/42?graph=102');
  });

  it('labels each allograph group like the image Annotations tab', async () => {
    renderGraphsTab();

    expect(await screen.findByRole('heading', { name: 'a, Insular' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'b, Caroline' })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/symbols_structure/allographs/?light=1');
  });

  // The fallback label is for the page only: a collected graph or a CSV row keeps no placeholder.
  it.each([
    [
      'fail to load',
      () => ({ ok: false, status: 500, json: async () => ({}) }),
      ['Allograph 11', 'Allograph 12'],
    ],
    [
      'lack its allograph',
      () => ({ ok: true, json: async () => ALLOGRAPHS.slice(1) }),
      ['Allograph 11', 'b, Caroline'],
    ],
  ])(
    'shows a graph under a fallback label, but collects and exports it without an allograph, when the allograph labels %s',
    async (_case, allographsResponse, headings) => {
      apiFetch.mockImplementation(async (url: string) =>
        url.includes('/graphs/') ? respond(url) : allographsResponse()
      );
      renderGraphsTab();

      expect(await screen.findByRole('heading', { name: headings[0] })).toBeTruthy();
      expect(screen.getByRole('heading', { name: headings[1] })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Select Allograph 11 graph 101' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add 1 to collection' }));
      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

      expect(addItem).toHaveBeenCalledTimes(1);
      expect(addItem.mock.calls[0][0]).toMatchObject({ id: 101, hand_name: 'Main Hand' });
      expect(addItem.mock.calls[0][0].allograph).toBeUndefined();
      expect(downloadCsv).toHaveBeenCalledWith(
        'hand-5-graphs.csv',
        'id,allograph,hand,described,components,features,positions,image,locus\n' +
          '101,,Main Hand,no,,,,42,face'
      );
    }
  );

  it('shows the load error, not an empty list, when the graphs request fails', async () => {
    apiFetch.mockImplementation(async (url: string) =>
      url.includes('/graphs/') ? { ok: false, status: 500, json: async () => ({}) } : respond(url)
    );
    renderGraphsTab();

    expect(await screen.findByText('Failed to load graphs.')).toBeTruthy();
    expect(screen.queryByText('No graphs associated to this hand.')).toBeNull();
  });

  it('loads the graphs again from the error message', async () => {
    let graphsFail = true;
    apiFetch.mockImplementation(async (url: string) =>
      graphsFail && url.includes('/graphs/')
        ? { ok: false, status: 500, json: async () => ({}) }
        : respond(url)
    );
    renderGraphsTab();
    const retry = await screen.findByRole('button', { name: 'Try again' });

    graphsFail = false;
    fireEvent.click(retry);

    expect(await screen.findAllByRole('button', { name: TOGGLE })).toHaveLength(2);
  });

  it('looks up a thumbnail crop only once it nears the screen', async () => {
    view.near = false;
    const { container, rerender } = renderGraphsTab();
    await screen.findAllByRole('button', { name: TOGGLE });
    expect(container.querySelectorAll('img')).toHaveLength(0);

    view.near = true;
    rerender(viewer());

    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('names each select toggle after its graph', async () => {
    renderGraphsTab();
    const toggle = await screen.findByRole('button', { name: 'Select a, Insular graph 101' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-label')).toBe('Unselect a, Insular graph 101');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('names each group checkbox after its allograph', async () => {
    renderGraphsTab();

    expect(
      await screen.findByRole('checkbox', { name: 'Select all a, Insular graphs' })
    ).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Select all b, Caroline graphs' })).toBeTruthy();
  });

  it('shows the selection bar only while something is selected', async () => {
    renderGraphsTab();
    const [firstToggle] = await screen.findAllByRole('button', { name: TOGGLE });
    expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();

    fireEvent.click(firstToggle);

    const bar = screen.getByRole('region', { name: 'Selection' });
    expect(within(bar).getByText('1 selected')).toBeTruthy();
  });

  it('adds only the selected graphs to the collection, as the image Annotations tab does', async () => {
    renderGraphsTab();
    const [firstToggle] = await screen.findAllByRole('button', { name: TOGGLE });

    fireEvent.click(firstToggle);
    expect(
      within(screen.getByRole('region', { name: 'Selection' })).getByText('1 selected')
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 to collection' }));

    expect(addItem).toHaveBeenCalledTimes(1);
    expect(addItem).toHaveBeenCalledWith({
      id: 101,
      type: 'graph',
      item_part: 22,
      item_image: 42,
      image_iiif: 'https://example.test/iiif/face.jp2',
      coordinates: JSON.stringify(GRAPHS[0].annotation),
      annotation_type: 'image',
      allograph: 'a, Insular',
      hand_name: 'Main Hand',
      shelfmark: 'Cotton Ch. 1',
      locus: 'face',
    });
  });

  it('still shows the graphs after leaving the tab while they load', async () => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    // Like fetch: a request whose signal is aborted fails.
    apiFetch.mockImplementation(
      (url: string, init?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
          void released.then(() => resolve(respond(url)));
        })
    );

    const { rerender } = renderGraphsTab();
    nav.search = '';
    rerender(viewer());
    nav.search = 'tab=graphs';
    rerender(viewer());
    release();

    expect(await screen.findAllByRole('button', { name: TOGGLE })).toHaveLength(2);
  });

  it('sizes the thumbnails with the S/M/L control of the image Annotations tab', async () => {
    renderGraphsTab();
    await screen.findAllByRole('button', { name: TOGGLE });
    expect(thumbSize).toHaveBeenLastCalledWith(500);

    fireEvent.click(screen.getByRole('radio', { name: 'L' }));

    expect(thumbSize).toHaveBeenLastCalledWith(700);
    expect(window.localStorage.getItem('annotation-gallery-density')).toBe('large');
  });

  it('selects every graph between two clicks when shift is held', async () => {
    const sameAllograph = [101, 103, 104].map((id) => ({ ...GRAPHS[0], id }));
    apiFetch.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('/graphs/') ? sameAllograph : ALLOGRAPHS),
    }));
    renderGraphsTab();
    const toggles = await screen.findAllByRole('button', { name: TOGGLE });

    fireEvent.click(toggles[0]);
    fireEvent.click(toggles[2], { shiftKey: true });

    expect(
      within(screen.getByRole('region', { name: 'Selection' })).getByText('3 selected')
    ).toBeTruthy();
  });

  it('exports the selected graphs as CSV, with their image and locus', async () => {
    renderGraphsTab();
    const [firstToggle] = await screen.findAllByRole('button', { name: TOGGLE });

    fireEvent.click(firstToggle);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(downloadCsv).toHaveBeenCalledWith(
      'hand-5-graphs.csv',
      'id,allograph,hand,described,components,features,positions,image,locus\n' +
        '101,"a, Insular",Main Hand,no,,,,42,face'
    );
  });
});
