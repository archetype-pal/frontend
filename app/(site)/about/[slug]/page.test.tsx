import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import type { MenuHeading, Page } from '@/lib/pages';
import AboutPage from './page';

const mockState = vi.hoisted(() => ({
  page: null as Page | null,
  headings: [] as MenuHeading[],
  aboutEnabled: true,
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }));

vi.mock('@/lib/pages-server', () => ({
  getPublishedPageBySlug: async () => mockState.page,
  getMenuHeadings: async () => mockState.headings,
}));

vi.mock('@/lib/site-features-server', () => ({
  readSiteFeatures: async () => {
    const config = getDefaultConfig();
    config.sections.about = mockState.aboutEnabled;
    return config;
  },
}));

// A server component of its own; not what these tests are about.
vi.mock('../_components/about-sidebar', () => ({ AboutSidebar: () => null }));

function page(menuHeading: string | null): Page {
  return {
    id: 1,
    slug: 'how-to-use',
    title: { en: 'How to use', fr: '', de: '' },
    content: { en: '<p>Body</p>', fr: '', de: '' },
    status: 'Published',
    menu_heading: menuHeading,
    order: 0,
    include_in_quick_link: false,
    created_at: '',
    updated_at: '',
  };
}

const renderPage = () => AboutPage({ params: Promise.resolve({ slug: 'how-to-use' }) });

beforeEach(() => {
  mockState.headings = [{ id: 1, slug: 'help', title: { en: 'Help', fr: '', de: '' } }];
  mockState.aboutEnabled = true;
});

describe('/about/[slug] with the About section switched off', () => {
  beforeEach(() => {
    mockState.aboutEnabled = false;
  });

  it("still renders a page under a custom heading (proxy.ts doesn't gate /about/*)", async () => {
    mockState.page = page('help');
    await expect(renderPage()).resolves.toBeTruthy();
  });

  it('404s a page listed under About', async () => {
    mockState.page = page(null);
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404s a page whose heading was deleted, since it falls back under About', async () => {
    mockState.page = page('deleted-heading');
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('/about/[slug] with the About section on', () => {
  it('renders a page listed under About', async () => {
    mockState.page = page(null);
    await expect(renderPage()).resolves.toBeTruthy();
  });

  it('404s a missing page', async () => {
    mockState.page = null;
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
