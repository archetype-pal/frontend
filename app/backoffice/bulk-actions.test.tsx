/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AnnotationsPage from './annotations/page';
import TrashPage from './trash/page';
import { renderWithQueryClient } from '@/test/render';
import type { GraphItem } from '@/types/backoffice';

const services = vi.hoisted(() => {
  const graph = (id: number): GraphItem => ({
    id,
    item_image: 11,
    image_display: 'Image',
    historical_item: 3,
    item_part: 7,
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
    graph,
    getGraphs: vi.fn(page),
    getTrashedGraphs: vi.fn(page),
    deleteGraph: vi.fn(),
    restoreGraph: vi.fn(),
    purgeGraph: vi.fn(),
  };
});

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/annotations', () => ({
  ...services,
  getTrashActors: vi.fn(async () => []),
}));

const renderPage = (Page: ComponentType) => renderWithQueryClient(<Page />);

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

describe('the image link on a backoffice annotation row', () => {
  const imageHrefs = (container: HTMLElement) =>
    [...container.querySelectorAll('a[href*="/images/11"]')].map((a) => a.getAttribute('href'));

  it.each([
    { list: 'Annotations', Page: AnnotationsPage },
    { list: 'Trash', Page: TrashPage },
  ])('$list opens the image under its item part', async ({ Page }) => {
    const { container } = renderPage(Page);
    await screen.findByText('Allograph 1');

    expect(imageHrefs(container)).toEqual(Array(3).fill('/manuscripts/7/images/11'));
  });

  it.each([
    { list: 'Annotations', Page: AnnotationsPage, load: services.getGraphs },
    { list: 'Trash', Page: TrashPage, load: services.getTrashedGraphs },
  ])(
    '$list falls back to the historical item when the API sends no item part',
    async ({ Page, load }) => {
      load.mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [{ ...services.graph(1), item_part: undefined }],
      });
      const { container } = renderPage(Page);
      await screen.findByText('Allograph 1');

      expect(imageHrefs(container)).toEqual(['/manuscripts/3/images/11']);
    }
  );
});
