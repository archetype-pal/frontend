/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommentsPage from './page';

const { getComments, getAllPublications, routerReplace, urlParams } = vi.hoisted(() => ({
  getComments: vi.fn(),
  getAllPublications: vi.fn(),
  routerReplace: vi.fn(),
  urlParams: { current: new URLSearchParams() },
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
  useSearchParams: () => urlParams.current,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/publications', () => ({
  getComments,
  getAllPublications,
  approveComment: vi.fn(),
  rejectComment: vi.fn(),
  deleteComment: vi.fn(),
}));

function comment(id: number) {
  return {
    id,
    post: 1,
    post_title: 'Post',
    post_slug: 'a-post',
    parent_author_name: null as string | null,
    parent_content: null as string | null,
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
    urlParams.current = new URLSearchParams();
    routerReplace.mockReset();
    getAllPublications.mockResolvedValue([
      { id: 7, title: 'Scribal hands', slug: 'scribal-hands', comment_count: 3 },
    ]);
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

  it('shows Read more on a comment taller than 8 lines', async () => {
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(200);
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
      return (this.textContent?.length ?? 0) > 1000 ? 600 : 200;
    });
    getComments.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { ...comment(1), content: '<p>Short one</p>' },
        { ...comment(2), content: `<p>Start ${'word '.repeat(250)}Finale</p>` },
      ],
    });
    renderPage();

    await screen.findByText('Short one');
    const readMore = await screen.findByRole('button', { name: 'Read more' });
    expect(readMore.getAttribute('aria-describedby')).toBe('comment-2-author');
    expect(document.getElementById('comment-2-author')?.textContent).toBe('Author 2');

    fireEvent.click(readMore);

    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    vi.restoreAllMocks();
  });

  it('names the comment a reply answers and leaves top level comments alone', async () => {
    getComments.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { ...comment(1), content: '<p>Which hand?</p>' },
        {
          ...comment(2),
          parent_author_name: 'Author 1',
          parent_content: '<p>Which <i>hand</i>?</p>',
        },
      ],
    });
    renderPage();

    expect(await screen.findByText('Reply to Author 1: “Which hand?”')).not.toBeNull();
    expect(screen.getAllByText(/^Reply to/)).toHaveLength(1);
  });

  it('links each comment to its post in the backoffice', async () => {
    getComments.mockResolvedValue({ count: 1, next: null, previous: null, results: [comment(1)] });
    renderPage();

    const link = await screen.findByRole('link', { name: 'Post' });
    expect(link.getAttribute('href')).toBe('/backoffice/publications/a-post');
  });

  it('shows only the comments on the post named in the address', async () => {
    urlParams.current = new URLSearchParams('post=7');
    renderPage();

    await waitFor(() =>
      expect(getComments).toHaveBeenLastCalledWith({ limit: 20, offset: 0, post: 7 })
    );
    expect((await screen.findByRole('combobox', { name: 'Filter by post' })).textContent).toContain(
      'Scribal hands'
    );
  });

  it('puts the chosen post in the address', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Filter by post' }));
    fireEvent.click(await screen.findByRole('option', { name: /Scribal hands/ }));

    expect(routerReplace).toHaveBeenCalledWith('?post=7', { scroll: false });
  });

  it('leaves posts without comments out of the post filter, unless the address names one', async () => {
    getAllPublications.mockResolvedValue([
      { id: 7, title: 'Scribal hands', slug: 'scribal-hands', comment_count: 3 },
      { id: 8, title: 'Quiet post', slug: 'quiet-post', comment_count: 0 },
      { id: 9, title: 'Another quiet post', slug: 'another-quiet-post', comment_count: 0 },
    ]);
    urlParams.current = new URLSearchParams('post=9');
    renderPage();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Filter by post' }));

    expect(await screen.findByRole('option', { name: /Scribal hands/ })).not.toBeNull();
    expect(screen.queryByRole('option', { name: /^Quiet post/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Another quiet post/ })).not.toBeNull();
  });

  it('takes the post out of the address when All posts is chosen', async () => {
    urlParams.current = new URLSearchParams('post=7');
    renderPage();

    fireEvent.click(await screen.findByRole('combobox', { name: 'Filter by post' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All posts' }));

    expect(routerReplace).toHaveBeenCalledWith('?', { scroll: false });
  });

  it('keeps showing that a post filter is on while the posts load', async () => {
    urlParams.current = new URLSearchParams('post=7');
    getAllPublications.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect((await screen.findByRole('combobox', { name: 'Filter by post' })).textContent).toBe(
      'Loading posts…'
    );
  });

  it('says the post is unknown when the address names no post', async () => {
    urlParams.current = new URLSearchParams('post=99');
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Filter by post' }).textContent).toBe(
        'Unknown post'
      )
    );
  });
});
