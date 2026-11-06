/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';

import AnnotationsPage from './annotations/page';
import TrashPage from './trash/page';
import { renderWithQueryClient } from '@/test/render';

const services = vi.hoisted(() => {
  const page = async () => ({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        item_image: 11,
        image_display: 'Image',
        historical_item: 3,
        item_part: 7,
        annotation: {},
        annotation_type: 'image',
        allograph: 1,
        allograph_name: 'Allograph 1',
        hand: 1,
        hand_name: 'Hand',
        positions: [],
        graphcomponent_set: [],
        created: null,
        deleted_at: null,
        deleted_by: null,
      },
    ],
  });
  return { getGraphs: vi.fn(page), getTrashedGraphs: vi.fn(page) };
});

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/annotations', () => ({
  ...services,
  deleteGraph: vi.fn(),
  restoreGraph: vi.fn(),
  purgeGraph: vi.fn(),
  getTrashActors: vi.fn(async () => []),
}));

describe('the image link on a backoffice annotation row', () => {
  it.each([
    { list: 'Annotations', Page: AnnotationsPage as ComponentType },
    { list: 'Trash', Page: TrashPage as ComponentType },
  ])('$list opens the image under its item part', async ({ Page }) => {
    const { container } = renderWithQueryClient(<Page />);
    await screen.findByText('Allograph 1');

    const hrefs = [...container.querySelectorAll('a[href*="/images/11"]')].map((a) =>
      a.getAttribute('href')
    );
    expect(hrefs).toEqual(['/manuscripts/7/images/11']);
  });
});
