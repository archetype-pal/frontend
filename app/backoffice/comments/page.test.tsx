/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommentsPage from './page';

const { getComments } = vi.hoisted(() => ({ getComments: vi.fn() }));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/publications', () => ({
  getComments,
  approveComment: vi.fn(),
  rejectComment: vi.fn(),
  deleteComment: vi.fn(),
}));

function comment(id: number) {
  return {
    id,
    post: 1,
    post_title: 'Post',
    content: `Comment ${id}`,
    author_name: `Author ${id}`,
    author_email: '',
    author_website: null,
    is_approved: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommentsPage />
    </QueryClientProvider>
  );
}

describe('<CommentsPage>', () => {
  beforeEach(() => {
    getComments.mockReset();
    getComments.mockImplementation(
      async ({ limit, offset }: { limit: number; offset: number }) => ({
        count: 45,
        next: null,
        previous: null,
        results: Array.from({ length: Math.min(limit, 45 - offset) }, (_, i) =>
          comment(offset + i + 1)
        ),
      })
    );
  });

  it('searches once typing stops, keeps the search while paging and restarts from the first page', async () => {
    renderPage();
    await screen.findByText('Comment 1');
    const search = screen.getByPlaceholderText('Search comments...');

    for (const value of ['s', 'sp', 'spam']) fireEvent.change(search, { target: { value } });
    await waitFor(() =>
      expect(getComments).toHaveBeenLastCalledWith({ limit: 20, offset: 0, search: 'spam' })
    );
    const searches = getComments.mock.calls.filter(([params]) => 'search' in params);
    expect(searches).toEqual([[{ limit: 20, offset: 0, search: 'spam' }]]);

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() =>
      expect(getComments).toHaveBeenLastCalledWith({ limit: 20, offset: 20, search: 'spam' })
    );

    fireEvent.change(search, { target: { value: 'spam link' } });
    await waitFor(() =>
      expect(getComments).toHaveBeenLastCalledWith({ limit: 20, offset: 0, search: 'spam link' })
    );
  });

  it('shows comment text as formatted HTML with scripts removed', async () => {
    getComments.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        { ...comment(1), content: '<p><i>Quoted</i> text</p><script>window.x = 1</script>' },
      ],
    });
    renderPage();

    expect((await screen.findByText('Quoted')).tagName).toBe('I');
    expect(document.body.querySelector('script')).toBeNull();
  });
});
