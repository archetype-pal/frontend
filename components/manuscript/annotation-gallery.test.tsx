import * as React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnotationGallery } from './annotation-gallery';
import type { BackendGraph } from '@/services/annotations';
import type { HandType } from '@/types/hands';

// Drives the real gallery: grouping, filtering, selection and the toolbar's
// summary line. Network-bound pieces (crops, the API, the router) are faked.

const mockState = vi.hoisted(() => ({
  user: null as { is_staff: boolean } | null,
  refresh: vi.fn(),
  crop: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/manuscripts/1/images/5',
  useRouter: () => ({ refresh: mockState.refresh, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockState.user, token: mockState.user ? 'token' : null }),
}));

// A small in-memory collection, so membership changes re-render the gallery.
const collection = vi.hoisted(() => {
  let ids = new Set<number>();
  const listeners = new Set<() => void>();
  const set = (next: Set<number>) => {
    ids = next;
    listeners.forEach((listener) => listener());
  };
  return {
    ids: () => ids,
    reset: (initial: number[] = []) => set(new Set(initial)),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    add: (id: number) => set(new Set(ids).add(id)),
    remove: (removed: number[]) => set(new Set([...ids].filter((id) => !removed.includes(id)))),
  };
});
vi.mock('@/contexts/collection-context', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useCollection: () => {
      const ids = useSyncExternalStore(collection.subscribe, collection.ids);
      return {
        addItem: (item: { id: number }) => collection.add(item.id),
        removeItem: (id: number) => collection.remove([id]),
        removeItems: (items: { id: number }[]) => collection.remove(items.map((i) => i.id)),
        isInCollection: (id: number) => ids.has(id),
      };
    },
  };
});

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (k: string) => k, getPluralLabel: (k: string) => k }),
}));

vi.mock('@/hooks/use-in-view', () => ({ useInView: () => true }));
vi.mock('@/hooks/use-iiif-thumbnail', () => ({
  useIiifThumbnail: () => mockState.crop(),
  // The edit sheet's preview strip.
  useIiifThumbnailUrl: () => null,
}));

const fetchAllographsMock = vi.hoisted(() => vi.fn());
vi.mock('@/services/manuscripts', () => ({ fetchAllographs: fetchAllographsMock }));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

const openLightboxMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/lightbox-utils', () => ({ openLightboxWithItems: openLightboxMock }));

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
  mockState.crop.mockReset();
  mockState.crop.mockReturnValue({ src: 'https://iiif.example/crop.jpg', failed: false });
  openLightboxMock.mockReset();
  collection.reset();
  fetchAllographsMock.mockReset();
  fetchAllographsMock.mockReturnValue(new Promise(() => {}));
  Object.values(toastMock).forEach((fn) => fn.mockReset());
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

describe('AnnotationGallery selection', () => {
  it('leaves selected graphs that the filters hide out of every action', () => {
    renderGallery();
    fireEvent.click(within(row('A')).getByRole('checkbox', { name: 'Select all A graphs' }));

    fireEvent.click(screen.getByRole('radio', { name: 'Undescribed 2' }));

    const bar = screen.getByRole('region', { name: 'Selection' });
    expect(within(bar).getByText('2 selected')).toBeTruthy();
    expect(within(bar).getByText('(1 hidden by filters, not included)')).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'Add 1 to collection' })).toBeTruthy();

    fireEvent.click(within(bar).getByRole('button', { name: 'Compare in lightbox' }));
    expect(openLightboxMock).toHaveBeenCalledWith([{ id: 4189, type: 'graph' }]);
  });

  it('disables the actions while every selected graph is hidden', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: 'Select b graph 4190' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Described 1' }));

    const bar = screen.getByRole('region', { name: 'Selection' });
    const add = within(bar).getByRole('button', { name: 'Add 0 to collection' });
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(within(bar).getByRole('button', { name: 'Clear' }).hasAttribute('disabled')).toBe(false);
  });
});

describe('AnnotationGallery delete', () => {
  it('hides a deleted graph without a confirm and brings it back on Undo', () => {
    mockState.user = { is_staff: true };
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderGallery();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: 'Select A graph 4189' }));

    fireEvent.click(screen.getByRole('button', { name: 'Move graph 4189 to the trash' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('#4189')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();
    expect(summary()).toBe('Showing 2 of 2 graphs in 2 allographs');
    const [message, options] = toastMock.success.mock.calls[0];
    expect(message).toBe('Graph #4189 moved to the trash. An admin can restore it.');

    act(() => options.action.onClick());
    expect(screen.getByText('#4189')).toBeTruthy();
    confirmSpy.mockRestore();
  });
});

describe('AnnotationGallery crops', () => {
  it('says when a crop fails and looks it up again on retry', () => {
    mockState.crop.mockImplementation(() => ({ src: null, failed: true }));
    renderGallery({ graphs: [GRAPHS[0]] });

    expect(screen.getByText("Image didn't load")).toBeTruthy();
    expect(screen.getByText('#4189')).toBeTruthy();
    const lookups = mockState.crop.mock.calls.length;

    mockState.crop.mockImplementation(() => ({
      src: 'https://iiif.example/crop.jpg',
      failed: false,
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry the image of graph 4189' }));

    expect(mockState.crop.mock.calls.length).toBeGreaterThan(lookups);
    expect(screen.queryByText("Image didn't load")).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry the image of graph 4189' })).toBeNull();
  });

  it('treats an image that errors after loading as failed', () => {
    renderGallery({ graphs: [GRAPHS[0]] });

    fireEvent.error(document.querySelector('img[src="https://iiif.example/crop.jpg"]')!);

    expect(screen.getByText("Image didn't load")).toBeTruthy();
  });
});

describe('AnnotationGallery edit sheet', () => {
  it('passes a failed allograph fetch to the sheet, and fetches again on retry', async () => {
    mockState.user = { is_staff: true };
    fetchAllographsMock.mockRejectedValueOnce(new Error('500'));
    renderGallery();
    fireEvent.keyDown(window, { key: 'a' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit graph 4189' }));
    expect(screen.getByRole('status').textContent).toBe('Loading allographs…');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load the allograph list.");

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(fetchAllographsMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('Loading allographs…');
  });
});

describe('AnnotationGallery collection', () => {
  it('says how many selected graphs went into the collection, and undoes it', () => {
    collection.reset([4410]);
    renderGallery();
    fireEvent.click(within(row('A')).getByRole('checkbox', { name: 'Select all A graphs' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add 2 to collection' }));

    expect([...collection.ids()].sort()).toEqual([4189, 4410]);
    expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();
    const [message, options] = toastMock.success.mock.calls[0];
    expect(message).toBe('Added 1 graph to your collection (1 already there).');
    expect(options.cancel.label).toBe('View collection');

    act(() => options.action.onClick());
    expect([...collection.ids()]).toEqual([4410]);
  });

  it('says so when every selected graph is already in the collection', () => {
    collection.reset([4190]);
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: 'Select b graph 4190' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add 1 to collection' }));

    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith('That graph is already in your collection.');
  });
});
