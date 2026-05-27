import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionProvider, useCollection, type CollectionItem } from './collection-context';

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
  const { items, addItem, isInCollection } = useCollection();

  return (
    <div>
      <output data-testid="count">{items.length}</output>
      <output data-testid="is-editorial-collected">
        {String(isInCollection(editorialItem.id, 'graph'))}
      </output>
      <button type="button" onClick={() => addItem(editorialItem)}>
        Add editorial annotation
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
    localStorage.setItem('archetype_collection', JSON.stringify([editorialItem]));

    renderHarness();

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('is-editorial-collected').textContent).toBe('true');
  });

  it('allows adding editorial annotation items', async () => {
    renderHarness();

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
    fireEvent.click(screen.getByRole('button', { name: 'Add editorial annotation' }));

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    expect(screen.getByTestId('is-editorial-collected').textContent).toBe('true');
    expect(localStorage.getItem('archetype_collection')).toContain('"annotation_type":"editorial"');
  });
});
