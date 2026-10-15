import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { nav, loadImagesMock } = vi.hoisted(() => ({
  nav: {
    params: new URLSearchParams(),
    replace: vi.fn(),
  },
  loadImagesMock: vi.fn(async () => []),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: nav.replace }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({ items: [] }),
}));

// Resolve ids without the API: each id becomes a minimal item of its type.
vi.mock('@/lib/lightbox-params', () => ({
  resolveItemById: vi.fn(async (type: string, id: string) => ({ id: Number(id), type })),
  resolveItemsByIds: vi.fn(
    async (type: string, ids: number[], _collection: unknown, out: unknown[]) => {
      out.push(...ids.map((id) => ({ id, type })));
    }
  ),
}));

vi.mock('@/components/lightbox/lightbox-viewer', () => ({ LightboxViewer: () => null }));
vi.mock('@/components/lightbox/lightbox-toolbar', () => ({ LightboxToolbar: () => null }));
vi.mock('@/components/lightbox/lightbox-sidebar', () => ({ LightboxSidebar: () => null }));
vi.mock('@/components/lightbox/lightbox-keyboard-shortcuts', () => ({
  LightboxKeyboardShortcuts: () => null,
}));

import LightboxPage from './page';
import { useLightboxStore } from '@/stores/lightbox-store';

function renderWithParams(query: string) {
  nav.params = new URLSearchParams(query);
  return render(<LightboxPage />);
}

const loadedItems = () =>
  (loadImagesMock.mock.calls as unknown as [{ id: number; type: string }[]][]).flatMap(([items]) =>
    items.map(({ id, type }) => `${type}:${id}`)
  );

describe('/lightbox item params', () => {
  beforeEach(() => {
    nav.replace.mockReset();
    loadImagesMock.mockClear();
    act(() => {
      useLightboxStore.setState({
        currentWorkspaceId: 'ws-1',
        error: null,
        isLoading: false,
        initialize: vi.fn(async () => undefined),
        loadImages: loadImagesMock as never,
      });
    });
  });

  it('loads both the images and the graphs of a mixed selection', async () => {
    renderWithParams('images=1,2&graphs=3');

    await waitFor(() => expect(loadImagesMock).toHaveBeenCalled());
    expect(loadedItems().sort()).toEqual(['graph:3', 'image:1', 'image:2']);
  });

  it('drops the item params once loaded, so reloading the page does not add them again', async () => {
    const { unmount } = renderWithParams('images=1&graphs=3');

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/lightbox'));
    expect(loadImagesMock).toHaveBeenCalledTimes(1);

    // Reload: the page comes back on the URL it was replaced with.
    unmount();
    renderWithParams(nav.replace.mock.calls[0][0].split('?')[1] ?? '');
    await act(async () => {});
    expect(loadImagesMock).toHaveBeenCalledTimes(1);
  });
});
