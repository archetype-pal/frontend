/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicationParams } from '@/utils/api';
import PaginatedPublications from './paginated-publications';

const { getPublications, nav } = vi.hoisted(() => ({
  getPublications: vi.fn(),
  nav: { search: '', push: vi.fn(), replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/utils/api', () => ({ getPublications }));

vi.mock('./blog-post-preview', () => ({
  default: ({ title }: { title: string }) => <h3>{title}</h3>,
}));

function post(id: number) {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    author: { first_name: 'Ada', last_name: 'Byron' },
    published_at: null,
    preview: '',
    keywords: [],
    number_of_comments: 0,
  };
}

function renderNews(search: string, count: number) {
  nav.search = search;
  getPublications.mockImplementation(async ({ limit = 0, offset = 0 }: PublicationParams) => ({
    count,
    results: Array.from({ length: Math.max(0, Math.min(limit, count - offset)) }, (_, i) =>
      post(offset + i + 1)
    ),
  }));
  render(<PaginatedPublications title="News" categoryFlag="is_news" basePath="/news" />);
}

describe('PaginatedPublications', () => {
  beforeEach(() => {
    getPublications.mockReset();
    nav.push.mockReset();
    nav.replace.mockReset();
  });

  it('loads the page and the page size given in the URL', async () => {
    renderNews('page=2&limit=50', 120);

    expect(await screen.findByRole('heading', { name: 'Post 51' })).toBeTruthy();
    expect(getPublications).toHaveBeenCalledWith({ limit: 50, offset: 50, is_news: true });
    expect(screen.getByText('51–100 of 120')).toBeTruthy();
  });

  it('shows 20 posts per page when the URL has no usable page size', async () => {
    renderNews('limit=500', 45);

    expect(await screen.findByRole('heading', { name: 'Post 20' })).toBeTruthy();
    expect(getPublications).toHaveBeenCalledWith({ limit: 20, offset: 0, is_news: true });
  });

  it('moves a page past the end to the last page without adding a history entry', async () => {
    renderNews('page=999', 45);

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/news?page=3'));
    expect(nav.push).not.toHaveBeenCalled();
  });
});
