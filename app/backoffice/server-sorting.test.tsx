/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ModelLabelsProvider } from '@/contexts/model-labels-context';
import AnnotationsPage from './annotations/page';
import ManuscriptsPage from './manuscripts/page';
import PhysicalVolumesPage from './physical-volumes/page';
import TrashPage from './trash/page';

const services = vi.hoisted(() => {
  const page = () => Promise.resolve({ count: 120, next: null, previous: null, results: [] });
  return {
    getHistoricalItems: vi.fn(page),
    getCurrentItems: vi.fn(page),
    getGraphs: vi.fn(page),
    getTrashedGraphs: vi.fn(page),
  };
});

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getHistoricalItems: services.getHistoricalItems,
  getCurrentItems: services.getCurrentItems,
  getRepositories: vi.fn(async () => []),
  deleteCurrentItem: vi.fn(),
}));
vi.mock('@/services/backoffice/annotations', () => ({
  getGraphs: services.getGraphs,
  deleteGraph: vi.fn(),
  getTrashedGraphs: services.getTrashedGraphs,
  getTrashActors: vi.fn(async () => []),
  restoreGraph: vi.fn(),
  purgeGraph: vi.fn(),
}));

function renderPage(Page: ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ModelLabelsProvider>
        <Page />
      </ModelLabelsProvider>
    </QueryClientProvider>
  );
}

describe('sorting a backoffice list on the server', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    {
      list: 'Manuscripts',
      Page: ManuscriptsPage,
      service: services.getHistoricalItems,
      column: 'Shelfmark',
      ordering: 'first_repository_label,first_shelfmark',
    },
    {
      list: 'Manuscripts',
      Page: ManuscriptsPage,
      service: services.getHistoricalItems,
      column: 'Date',
      ordering: 'date__min_weight,date__max_weight',
    },
    {
      list: 'Items',
      Page: PhysicalVolumesPage,
      service: services.getCurrentItems,
      column: 'Repository',
      ordering: 'repository__label',
    },
    {
      list: 'Annotations',
      Page: AnnotationsPage,
      service: services.getGraphs,
      column: 'Allograph',
      ordering: 'allograph__name',
    },
    {
      list: 'Trash',
      Page: TrashPage,
      service: services.getTrashedGraphs,
      column: 'Image',
      ordering:
        'item_image__item_part__current_item__repository__label,item_image__item_part__current_item__shelfmark,item_image__item_part__current_item_locus,item_image__locus',
    },
    {
      list: 'Trash',
      Page: TrashPage,
      service: services.getTrashedGraphs,
      column: 'Deleted by',
      ordering: 'deleted_by__username',
    },
  ])(
    '$list sorts its $column column by the field it shows, from the first page',
    async ({ Page, service, column, ordering }) => {
      renderPage(Page);
      fireEvent.click(await screen.findByRole('button', { name: 'Go to page 2' }));
      await waitFor(() =>
        expect(service).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 }))
      );

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${column}`) }));

      await waitFor(() =>
        expect(service).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, ordering }))
      );
    }
  );
});
