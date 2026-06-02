import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionProvider, useCollection, type CollectionItem } from './collection-context';
import {
  COLLECTION_STORAGE_KEY,
  COLLECTION_STORAGE_VERSION,
  LEGACY_COLLECTION_STORAGE_KEY,
} from '@/lib/collection-storage';

const editorialItem: CollectionItem = {
  id: 42,
  type: 'graph',
  annotation_type: 'editorial',
  item_part: 3,
  item_image: 7,
  image_iiif: 'https://example.test/iiif/7/info.json',
  coordinates: '{"type":"Feature"}',
  shelfmark: 'NRS GD55/6',
  locus: 'face',
};

function Harness() {
  const {
    items,
    collections,
    activeCollection,
    addItem,
    createCollection,
    switchCollection,
    isInCollection,
  } = useCollection();

  return (
    <div>
      <output data-testid="count">{items.length}</output>
      <output data-testid="collection-count">{collections.length}</output>
      <output data-testid="active-collection">{activeCollection.name}</output>
      <output data-testid="is-editorial-collected">
        {String(isInCollection(editorialItem.id, 'graph'))}
      </output>
      <button type="button" onClick={() => addItem(editorialItem)}>
        Add editorial annotation
      </button>
      <button type="button" onClick={() => createCollection('Research')}>
        Create research collection
      </button>
      <button type="button" onClick={() => switchCollection('default')}>
        Switch to default collection
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <CollectionProvider>
      <Harness />
    </CollectionProvider>
  );
}

function createStorageStub(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: vi.fn(() => {
      store = {};
    }),
    getItem: vi.fn((key: string) => store[key] ?? null),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
  };
}

describe('CollectionProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageStub());
  });

  it('hydrates editorial annotation items from storage', async () => {
    localStorage.setItem(LEGACY_COLLECTION_STORAGE_KEY, JSON.stringify([editorialItem]));

    renderHarness();

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('is-editorial-collected').textContent).toBe('true');
    expect(JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY) ?? '{}')).toMatchObject({
      version: COLLECTION_STORAGE_VERSION,
      activeCollectionId: 'default',
      collections: [{ id: 'default', name: 'Collection', items: [editorialItem] }],
    });
  });

  it('allows adding editorial annotation items', async () => {
    renderHarness();

    await waitFor(() => expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Add editorial annotation' }));

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('is-editorial-collected').textContent).toBe('true');
    expect(localStorage.getItem(LEGACY_COLLECTION_STORAGE_KEY)).toContain(
      '"annotation_type":"editorial"'
    );
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toContain('"annotation_type":"editorial"');
  });

  it('hydrates the active collection from versioned storage and mirrors its items', async () => {
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify({
        version: COLLECTION_STORAGE_VERSION,
        activeCollectionId: 'research',
        collections: [
          { id: 'default', name: 'Collection', items: [] },
          { id: 'research', name: 'Research', items: [editorialItem] },
        ],
      })
    );

    renderHarness();

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('is-editorial-collected').textContent).toBe('true');
    expect(JSON.parse(localStorage.getItem(LEGACY_COLLECTION_STORAGE_KEY) ?? '[]')).toEqual([
      editorialItem,
    ]);
  });

  it('does not overwrite a storage version it does not understand', async () => {
    const futureState = JSON.stringify({
      version: COLLECTION_STORAGE_VERSION + 1,
      activeCollectionId: 'future',
      collections: [{ id: 'future', name: 'Future', items: [] }],
    });
    localStorage.setItem(COLLECTION_STORAGE_KEY, futureState);
    localStorage.setItem(LEGACY_COLLECTION_STORAGE_KEY, JSON.stringify([editorialItem]));

    renderHarness();

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toBe(futureState);
  });

  it('creates, activates, and switches between named collections', async () => {
    renderHarness();

    await waitFor(() => expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Add editorial annotation' }));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    fireEvent.click(screen.getByRole('button', { name: 'Create research collection' }));
    await waitFor(() =>
      expect(screen.getByTestId('active-collection').textContent).toBe('Research')
    );
    expect(screen.getByTestId('collection-count').textContent).toBe('2');
    expect(screen.getByTestId('count').textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to default collection' }));
    await waitFor(() =>
      expect(screen.getByTestId('active-collection').textContent).toBe('Collection')
    );
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
