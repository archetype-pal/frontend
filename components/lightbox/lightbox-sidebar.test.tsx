import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { collection, loadImagesMock } = vi.hoisted(() => ({
  collection: { items: [] as { id: number; type: 'image' | 'graph' }[] },
  loadImagesMock: vi.fn(async () => []),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => collection,
}));

import { LightboxSidebar } from './lightbox-sidebar';
import { useLightboxStore } from '@/stores/lightbox-store';

describe('LightboxSidebar adding from the collection', () => {
  beforeEach(() => {
    loadImagesMock.mockClear();
    collection.items = [
      { id: 1, type: 'image' },
      { id: 2, type: 'graph' },
    ];
    act(() => {
      useLightboxStore.setState({
        workspaces: [{ id: 'ws-1', name: 'Workspace 1', images: [], createdAt: 1, updatedAt: 1 }],
        currentWorkspaceId: 'ws-1',
        images: new Map(),
        loadImages: loadImagesMock as never,
      });
    });
  });

  it('labels the add button so its purpose is clear', () => {
    render(<LightboxSidebar />);

    const button = screen.getByRole('button', { name: 'Add all from collection' });
    expect(button.getAttribute('title')).toBe('Add all from collection');

    fireEvent.click(button);
    expect(loadImagesMock).toHaveBeenCalledWith(collection.items);
  });

  it('lets the empty workspace hint add the collection too', () => {
    render(<LightboxSidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Add images from your collection' }));

    expect(loadImagesMock).toHaveBeenCalledWith(collection.items);
  });

  it('keeps the hint as plain text when the collection is empty', () => {
    collection.items = [];
    render(<LightboxSidebar />);

    expect(screen.getByText('Add images from your collection').tagName).toBe('P');
    expect(
      (screen.getByRole('button', { name: 'Add all from collection' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
