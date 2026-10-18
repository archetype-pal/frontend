/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AnnotationsPage from './annotations/page';
import TrashPage from './trash/page';

const services = vi.hoisted(() => {
  const graph = (id: number) => ({
    id,
    item_image: 1,
    image_display: 'Image',
    historical_item: 1,
    annotation: {},
    annotation_type: 'image',
    allograph: 1,
    allograph_name: `Allograph ${id}`,
    hand: 1,
    hand_name: 'Hand',
    positions: [],
    graphcomponent_set: [],
    created: null,
    deleted_at: null,
    deleted_by: null,
  });
  const page = async () => ({
    count: 3,
    next: null,
    previous: null,
    results: [1, 2, 3].map(graph),
  });
  return {
    getGraphs: vi.fn(page),
    getTrashedGraphs: vi.fn(page),
    deleteGraph: vi.fn(),
    restoreGraph: vi.fn(),
    purgeGraph: vi.fn(),
  };
});

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/services/backoffice/annotations', () => ({
  ...services,
  getTrashActors: vi.fn(async () => []),
}));

function renderPage(Page: ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>
  );
}

describe('a bulk action on a backoffice list', () => {
  beforeEach(() => {
    services.deleteGraph.mockReset();
    services.restoreGraph.mockReset();
    services.purgeGraph.mockReset();
  });

  it.each([
    { list: 'Annotations', Page: AnnotationsPage, button: 'Delete', run: services.deleteGraph },
    { list: 'Trash', Page: TrashPage, button: 'Restore', run: services.restoreGraph },
    {
      list: 'Trash',
      Page: TrashPage,
      button: 'Purge',
      confirm: 'Delete forever',
      run: services.purgeGraph,
    },
  ])(
    '$list $button keeps exactly the failed rows ticked, then clears them once a retry succeeds',
    async ({ Page, button, confirm, run }) => {
      renderPage(Page);
      await screen.findByText('Allograph 1');
      const rowBoxes = () => screen.getAllByRole('checkbox', { name: 'Select row' });
      const runBulk = () => {
        fireEvent.click(screen.getByRole('button', { name: button }));
        if (confirm) fireEvent.click(screen.getByRole('button', { name: confirm }));
      };
      fireEvent.click(rowBoxes()[0]);
      fireEvent.click(rowBoxes()[1]);

      run.mockImplementation(async (id: number) => {
        if (id === 1) throw new Error('500');
      });
      runBulk();
      await screen.findByText('1 selected');
      expect(rowBoxes()[0].getAttribute('aria-checked')).toBe('true');
      expect(rowBoxes()[1].getAttribute('aria-checked')).toBe('false');

      run.mockReset();
      run.mockResolvedValue(undefined);
      runBulk();
      await waitFor(() => expect(screen.queryByText('1 selected')).toBeNull());
      expect(run.mock.calls).toEqual([[1]]);
    }
  );
});
