import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnotationGallery } from './annotation-gallery';
import type { BackendGraph } from '@/services/annotations';
import type { HandType } from '@/types/hands';

// Drives the real gallery: grouping, filtering, selection and the toolbar's
// summary line. Network-bound pieces (crops, the API, the router) are faked.

const mockState = vi.hoisted(() => ({
  user: null as { is_staff: boolean } | null,
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/manuscripts/1/images/5',
  useRouter: () => ({ refresh: mockState.refresh, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockState.user, token: mockState.user ? 'token' : null }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isInCollection: () => false,
  }),
}));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (k: string) => k, getPluralLabel: (k: string) => k }),
}));

vi.mock('@/hooks/use-in-view', () => ({ useInView: () => true }));
vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnailUrl: () => 'https://iiif.example/crop.jpg',
}));

vi.mock('@/services/manuscripts', () => ({ fetchAllographs: vi.fn(() => new Promise(() => {})) }));

const HAND: HandType = {
  id: 141,
  name: 'Main Hand',
  scribe: 1,
  item_part: 1,
  date: '',
  place: '',
  descriptions: [],
};

const ALLOGRAPHS = [
  { id: 62, name: 'A' },
  { id: 16, name: 'b' },
];

function makeGraph(overrides: Partial<BackendGraph> = {}): BackendGraph {
  return {
    id: 1,
    item_image: 5,
    annotation: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } },
    allograph: 62,
    hand: 141,
    graphcomponent_set: [],
    positions: [],
    is_described: false,
    ...overrides,
  } as BackendGraph;
}

const GRAPHS = [
  makeGraph({ id: 4189, allograph: 62 }),
  makeGraph({ id: 4410, allograph: 62, is_described: true }),
  makeGraph({ id: 4190, allograph: 16 }),
];

function renderGallery(props: Partial<React.ComponentProps<typeof AnnotationGallery>> = {}) {
  return render(
    <AnnotationGallery
      manuscriptId="1"
      imageId="5"
      itemImageId={5}
      itemPartId={1}
      iiifImage="https://iiif.example/image"
      locus="face"
      shelfmark="BL Cotton Ch. xviii.2"
      graphs={GRAPHS}
      hands={[HAND]}
      allographs={ALLOGRAPHS}
      {...props}
    />
  );
}

const summary = () => screen.getByText(/^Showing/).textContent;
const row = (name: string) => screen.getByRole('group', { name });

beforeEach(() => {
  mockState.user = null;
  mockState.refresh.mockReset();
  window.history.replaceState(null, '', '/manuscripts/1/images/5');
});

describe('AnnotationGallery layout', () => {
  it('shows one row per allograph with its counts', () => {
    renderGallery();

    expect(summary()).toBe('Showing 3 of 3 graphs in 2 allographs');
    const a = row('A');
    expect(within(a).getByText('2 graphs')).toBeTruthy();
    expect(within(a).getByText('1 described')).toBeTruthy();
    expect(within(a).getByText('#4189')).toBeTruthy();
    expect(within(row('b')).getByText('1 graph')).toBeTruthy();
  });

  it('counts each description status and filters by it', () => {
    renderGallery();

    fireEvent.click(screen.getByRole('radio', { name: 'Described 1' }));

    expect(summary()).toBe('Showing 1 of 3 graphs in 1 allograph');
    expect(screen.queryByRole('group', { name: 'b' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove filter Described' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Undescribed 2' })).toBeTruthy();
  });

  it('selects a whole row from its box, and shows a partial row as mixed', () => {
    renderGallery();
    const box = within(row('A')).getByRole('checkbox', { name: 'Select all A graphs' });

    fireEvent.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(
      within(screen.getByRole('region', { name: 'Selection' })).getByText('2 selected')
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Unselect A graph 4189' }));
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    expect(within(row('A')).getByText('1 selected')).toBeTruthy();
  });

  it('keeps the selection bar away until something is selected', () => {
    renderGallery();
    expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();
  });

  it('says when the filters match nothing, and clears them on request', () => {
    renderGallery();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('No graphs match these filters')).toBeTruthy();
    expect(screen.getByText('No allograph on this image matches “zzz”.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(summary()).toBe('Showing 3 of 3 graphs in 2 allographs');
  });

  it('keeps the filters in the address without a navigation', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('radio', { name: 'Undescribed 2' }));
    expect(window.location.search).toBe('?s=undescribed');
  });
});

describe('AnnotationGallery states', () => {
  it('offers a retry and the image viewer when the annotations failed to load', () => {
    renderGallery({ loadError: true });

    expect(screen.getByText("Couldn't load annotations")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockState.refresh).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Open the image viewer' }).getAttribute('href')).toBe(
      '/manuscripts/1/images/5'
    );
  });

  it('tells visitors an image has no annotations yet', () => {
    renderGallery({ graphs: [] });
    expect(screen.getByText('No annotations on this image yet')).toBeTruthy();
    expect(screen.getByText("This image hasn't been annotated yet.")).toBeTruthy();
  });

  it('pauses editing when the hand or allograph names failed to load', () => {
    mockState.user = { is_staff: true };
    renderGallery({ supportingDataIncomplete: true });

    expect(screen.getByRole('alert').textContent).toContain('editing is paused');
    const toggle = screen.getByRole('switch', { name: 'Editing mode' });
    expect(toggle.hasAttribute('disabled')).toBe(true);

    fireEvent.keyDown(window, { key: 'a' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('lets staff switch to editing mode with the A key', () => {
    mockState.user = { is_staff: true };
    renderGallery();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('switch', { name: 'Editing mode' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getByText('Editing mode: clicking a graph selects it')).toBeTruthy();
  });
});
