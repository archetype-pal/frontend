/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Suspense, startTransition, use, useState } from 'react';
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

function posts(count: number, { limit = 0, offset = 0 }: PublicationParams) {
  return {
    count,
    results: Array.from({ length: Math.max(0, Math.min(limit, count - offset)) }, (_, i) =>
      post(offset + i + 1)
    ),
  };
}

function renderNews(search: string, count: number) {
  nav.search = search;
  getPublications.mockImplementation(async (params: PublicationParams) => posts(count, params));
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

  it('offers only the recent posts in the sidebar, with no dead date filter or feed link', async () => {
    renderNews('', 45);

    const sidebar = screen.getByRole('complementary');
    expect(await within(sidebar).findByRole('link', { name: 'Post 5' })).toBeTruthy();
    expect(
      within(sidebar)
        .getAllByRole('heading')
        .map((h) => h.textContent)
    ).toEqual(['Recent Posts']);
    expect(within(sidebar).queryByRole('combobox')).toBeNull();
    expect(within(sidebar).queryByText(/RSS|Atom/)).toBeNull();
    expect(
      within(sidebar)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
    ).not.toContain('#');
  });

  it('dims the posts from the click until the next page has loaded', async () => {
    let land!: () => void;
    const landed = new Promise<void>((resolve) => (land = resolve));
    let serve!: () => void;
    const served = new Promise<void>((resolve) => (serve = resolve));
    const router: { navigate?: (url: string) => void } = {};
    // Like the Next router: the URL changes in a transition that waits for the new page.
    function Router() {
      const [url, setUrl] = useState('/news');
      router.navigate = setUrl;
      if (url !== '/news') use(landed);
      nav.search = new URL(url, 'http://localhost').search;
      return <PaginatedPublications title="News" categoryFlag="is_news" basePath="/news" />;
    }
    nav.push.mockImplementation((url: string) => startTransition(() => router.navigate!(url)));
    getPublications.mockImplementation(async (params: PublicationParams) => {
      if (params.offset) await served;
      return posts(45, params);
    });
    render(
      <Suspense>
        <Router />
      </Suspense>
    );
    await screen.findByRole('heading', { name: 'Post 1' });
    const busy = () => document.querySelector('main [aria-busy="true"]');
    expect(busy()).toBeNull();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' })));
    expect(busy()).not.toBeNull();

    await act(async () => land());
    expect(getPublications).toHaveBeenCalledWith({ limit: 20, offset: 20, is_news: true });
    expect(busy()).not.toBeNull();

    await act(async () => serve());
    expect(await screen.findByRole('heading', { name: 'Post 21' })).toBeTruthy();
    expect(busy()).toBeNull();
  });
});
