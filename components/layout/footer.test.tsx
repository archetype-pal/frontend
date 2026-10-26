import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import type { MenuHeading, PageListItem } from '@/lib/pages';
import Footer from './footer';

const mockState = vi.hoisted(() => ({
  pages: [] as PageListItem[],
  headings: [] as MenuHeading[],
  aboutEnabled: true,
}));

vi.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => (key: string) => key,
}));

vi.mock('@/lib/model-labels-server', async () => {
  const { getDefaultModelLabelsConfig } = await import('@/lib/model-labels');
  return { readModelLabels: async () => getDefaultModelLabelsConfig() };
});

vi.mock('@/lib/pages-server', () => ({
  getPublishedPages: async () => mockState.pages,
  getMenuHeadings: async () => mockState.headings,
}));

vi.mock('@/lib/site-features-server', () => ({
  readSiteFeatures: async () => {
    const config = getDefaultConfig();
    config.sections.about = mockState.aboutEnabled;
    return config;
  },
}));

vi.mock('@/utils/api', () => ({
  fetchPartners: async () => [],
  getCarouselImageUrl: (url: string) => url,
}));

function quickLink(slug: string, menuHeading: string | null): PageListItem {
  return {
    id: 0,
    slug,
    title: { en: slug, fr: '', de: '' },
    status: 'Published',
    menu_heading: menuHeading,
    order: 0,
    include_in_quick_link: true,
    updated_at: '',
  };
}

async function quickLinkHrefs() {
  render(await Footer());
  return screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
    .filter((href) => href?.startsWith('/about/'));
}

beforeEach(() => {
  mockState.headings = [{ id: 1, slug: 'help', title: { en: 'Help', fr: '', de: '' } }];
  mockState.pages = [
    quickLink('accessibility', null),
    quickLink('how-to-use', 'help'),
    quickLink('orphan', 'deleted-heading'),
    { ...quickLink('not-a-quick-link', null), include_in_quick_link: false },
  ];
  mockState.aboutEnabled = true;
});

describe('<Footer> quick links', () => {
  it('lists every quick-link page while About is on', async () => {
    expect(await quickLinkHrefs()).toEqual([
      '/about/accessibility',
      '/about/how-to-use',
      '/about/orphan',
    ]);
  });

  it("drops About's pages when About is off, since they 404", async () => {
    mockState.aboutEnabled = false;
    // The deleted heading's page falls back under About, so it goes too.
    expect(await quickLinkHrefs()).toEqual(['/about/how-to-use']);
  });
});
