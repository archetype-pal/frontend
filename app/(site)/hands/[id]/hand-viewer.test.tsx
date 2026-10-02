/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandDetail, HandImage, HandManuscript } from '@/types/hand-detail';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { getDefaultConfig } from '@/lib/site-features';
import { HandViewer } from './hand-viewer';

const { addItem, apiFetch, nav, thumbSize, GRAPHS, ALLOGRAPHS } = vi.hoisted(() => {
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

vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnailUrl: (_infoUrl: string, _coordinates: string, maxSize?: number) => {
    thumbSize(maxSize);
    return 'https://example.test/crop.jpg';
  },
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({ addItem, isInCollection: () => false }),
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
  description: null,
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
    thumbSize.mockClear();
    window.localStorage.clear();
    nav.search = 'tab=graphs';
    apiFetch.mockReset();
    apiFetch.mockImplementation(async (url: string) => respond(url));
  });

  it('links each graph to its place on the image viewer, named by allograph and id', async () => {
    renderGraphsTab();

    const first = await screen.findByRole('link', { name: 'a, Insular, graph 101' });
    const second = screen.getByRole('link', { name: 'b, Caroline, graph 102' });

    expect(first.getAttribute('href')).toBe('/manuscripts/22/images/42?graph=101');
    expect(second.getAttribute('href')).toBe('/manuscripts/22/images/42?graph=102');
  });

  it('labels each allograph group like the image Annotations tab', async () => {
    renderGraphsTab();

    expect(await screen.findByRole('heading', { name: 'a, Insular' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'b, Caroline' })).toBeTruthy();
  });

  it('shows the selection bar before anything is selected, with its actions disabled', async () => {
    renderGraphsTab();
    const [firstToggle] = await screen.findAllByRole('button', { name: 'Select graph' });
    const addButton = screen.getByRole('button', {
      name: 'Add to collection',
    }) as HTMLButtonElement;

    expect(screen.getByText('0 selected')).toBeTruthy();
    expect(addButton.disabled).toBe(true);

    fireEvent.click(firstToggle);

    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(addButton.disabled).toBe(false);
  });

  it('adds only the selected graphs to the collection, as the image Annotations tab does', async () => {
    renderGraphsTab();
    const [firstToggle] = await screen.findAllByRole('button', { name: 'Select graph' });

    fireEvent.click(firstToggle);
    expect(screen.getByText('1 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to collection' }));

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

    expect(await screen.findAllByRole('button', { name: 'Select graph' })).toHaveLength(2);
  });

  it('sizes the thumbnails with the S/M/L control of the image Annotations tab', async () => {
    renderGraphsTab();
    await screen.findAllByRole('button', { name: 'Select graph' });
    expect(thumbSize).toHaveBeenLastCalledWith(500);

    fireEvent.click(screen.getByRole('radio', { name: 'L' }));

    expect(thumbSize).toHaveBeenLastCalledWith(700);
    expect(window.localStorage.getItem('annotation-gallery-density')).toBe('large');
  });
});
