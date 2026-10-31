/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PublicationsPage from './page';
import { createTestQueryClient } from '@/test/query-client';

const { getPublications } = vi.hoisted(() => ({ getPublications: vi.fn() }));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/publications', () => ({
  getPublications,
  updatePublication: vi.fn(),
  deletePublication: vi.fn(),
}));

function renderPage() {
  const client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <PublicationsPage />
    </QueryClientProvider>
  );
}

/** Picks an option of a filter bar select: the status filter comes first, then the type. */
function pick(filterIndex: number, option: string) {
  fireEvent.keyDown(screen.getAllByRole('combobox')[filterIndex], { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function post(id: number, title: string, commentCount: number) {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/ /g, '-'),
    status: 'Published' as const,
    is_blog_post: true,
    is_news: false,
    is_featured: false,
    author: 1,
    author_name: 'editor',
    published_at: null,
    created_at: '2015-05-02T00:00:00Z',
    comment_count: commentCount,
  };
}

describe('<PublicationsPage>', () => {
  beforeEach(() => {
    getPublications.mockReset();
    getPublications.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it('asks the server for the posts matching the status and type filters', async () => {
    renderPage();
    await waitFor(() => expect(getPublications).toHaveBeenCalledWith({ limit: 20, offset: 0 }));

    pick(0, 'Published');
    await waitFor(() =>
      expect(getPublications).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        status: 'Published',
      })
    );

    pick(1, 'News');
    await waitFor(() =>
      expect(getPublications).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        status: 'Published',
        is_news: true,
      })
    );
  });

  it('links a comment count to the comments on that post', async () => {
    getPublications.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [post(7, 'Scribal hands', 11), post(8, 'Quiet post', 0)],
    });
    renderPage();

    const link = await screen.findByRole('link', { name: '11 comments on Scribal hands' });
    expect(link.getAttribute('href')).toBe('/backoffice/comments?post=7');
    expect(screen.queryByRole('link', { name: /on Quiet post/ })).toBeNull();
  });
});
