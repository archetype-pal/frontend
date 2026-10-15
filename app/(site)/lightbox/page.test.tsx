import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { nav, loadImagesMock, failingPaths } = vi.hoisted(() => ({
  nav: {
    params: new URLSearchParams(),
    replace: vi.fn(),
  },
  loadImagesMock: vi.fn(async () => []),
  failingPaths: new Set<string>(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: nav.replace }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({ items: [] }),
}));

// The search API returns a minimal record for each id, or a 500 for the paths
// in `failingPaths` (e.g. `/api/v1/search/graphs/3/`).
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: vi.fn(async (path: string) =>
    failingPaths.has(path)
      ? { ok: false, status: 500, statusText: 'Internal Server Error' }
      : { ok: true, json: async () => ({ id: Number(path.split('/').at(-2)) }) }
  ),
}));

vi.mock('@/components/lightbox/lightbox-viewer', () => ({ LightboxViewer: () => null }));
vi.mock('@/components/lightbox/lightbox-toolbar', () => ({ LightboxToolbar: () => null }));
vi.mock('@/components/lightbox/lightbox-sidebar', () => ({ LightboxSidebar: () => null }));
vi.mock('@/components/lightbox/lightbox-keyboard-shortcuts', () => ({
  LightboxKeyboardShortcuts: () => null,
}));

import { toast } from 'sonner';
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
    failingPaths.clear();
    vi.spyOn(toast, 'error').mockClear();
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
    const { rerender } = renderWithParams('images=1&graphs=3');

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/lightbox'));
    expect(loadImagesMock).toHaveBeenCalledTimes(1);

    // Next delivers the replaced URL by re-rendering the mounted page, which
    // re-runs the params effect; a reload then starts from that same URL.
    nav.params = new URLSearchParams(nav.replace.mock.calls[0][0].split('?')[1] ?? '');
    rerender(<LightboxPage />);
    await act(async () => {});
    expect(loadImagesMock).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it('names a kind that failed while the other loaded, and keeps only its ids to retry', async () => {
    failingPaths.add('/api/v1/search/graphs/3/');
    const { rerender, unmount } = renderWithParams('images=1,2&graphs=3,4');

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/lightbox?graphs=3'));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('graph 3'));
    expect(loadedItems().sort()).toEqual(['graph:4', 'image:1', 'image:2']);

    // The re-render that delivers the new URL doesn't retry on its own.
    nav.params = new URLSearchParams('graphs=3');
    rerender(<LightboxPage />);
    await act(async () => {});
    expect(loadImagesMock).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(useLightboxStore.getState().error).toBeNull();

    // Reloading it once the graph is reachable again loads just that graph.
    unmount();
    failingPaths.clear();
    loadImagesMock.mockClear();
    renderWithParams('graphs=3');
    await waitFor(() => expect(loadImagesMock).toHaveBeenCalled());
    expect(loadedItems()).toEqual(['graph:3']);
  });

  it('names images that failed while the graphs loaded, over the workspace', async () => {
    failingPaths.add('/api/v1/search/item-images/1/');
    renderWithParams('images=1&graphs=3');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('image 1'))
    );
    expect(loadedItems()).toEqual(['graph:3']);
    expect(nav.replace).toHaveBeenCalledWith('/lightbox?images=1');
    expect(useLightboxStore.getState().error).toBeNull();
  });
});
