/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageListItem } from '@/lib/pages';
import type { ResultType } from '@/lib/search-types';
import Header from './header';

const mockState = vi.hoisted(() => ({
  enabledCategories: ['images'] as ResultType[],
  push: vi.fn(),
  loadGlobalSuggestions: vi.fn(),
  getServerSuggestions: vi.fn(async () => []),
  siteFeatures: {
    sectionOrder: ['search'] as string[],
    enabledSections: ['search'] as string[],
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'collection') return `${values?.name ?? 'Collection'} (${values?.count ?? 0})`;
    if (key === 'searchPlaceholder') return 'Search';
    if (key === 'searchNoSuggestions') return 'No suggestions';
    if (key === 'home') return 'Home';
    if (key === 'menu') return 'Menu';
    if (key === 'openMenu') return 'Open menu';
    if (key === 'closeMenu') return 'Close menu';
    return key;
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null, logout: vi.fn() }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({ items: [], activeCollection: { name: 'My Collection' } }),
}));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({
    getLabel: (key: string) => {
      const labels: Record<string, string> = { siteTitle: 'Archetype', siteTagline: 'Test corpus' };
      return labels[key] ?? key;
    },
  }),
}));

vi.mock('@/contexts/site-features-context', () => ({
  useSiteFeatures: () => ({
    config: {
      sectionOrder: mockState.siteFeatures.sectionOrder,
      sections: { search: true },
      searchCategories: {},
    },
    isSectionEnabled: (key: string) => mockState.siteFeatures.enabledSections.includes(key),
    enabledCategories: mockState.enabledCategories,
  }),
}));

vi.mock('@/contexts/search-context', () => ({
  useSearchContext: () => ({
    suggestionsPool: [],
    loadGlobalSuggestions: mockState.loadGlobalSuggestions,
    getServerSuggestions: mockState.getServerSuggestions,
  }),
}));

function renderHeader(props: React.ComponentProps<typeof Header> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Header {...props} />
    </QueryClientProvider>
  );
}

function listItem(slug: string, title: string, menuHeading: string | null): PageListItem {
  return {
    id: 0,
    slug,
    title: { en: title, fr: '', de: '' },
    status: 'Published',
    menu_heading: menuHeading,
    order: 0,
    include_in_quick_link: false,
    updated_at: '',
  };
}

beforeEach(() => {
  mockState.enabledCategories = ['images'];
  mockState.siteFeatures = { sectionOrder: ['search'], enabledSections: ['search'] };
  mockState.push.mockClear();
  mockState.loadGlobalSuggestions.mockClear();
  mockState.getServerSuggestions.mockClear();
});

describe('<Header> search entry points', () => {
  it('uses the first enabled search category instead of hardcoded Manuscripts', async () => {
    renderHeader();

    expect(screen.getByRole('link', { name: /Explore/ }).getAttribute('href')).toBe(
      '/search/images'
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Kelso' } });
    await waitFor(() => {
      expect(mockState.getServerSuggestions).toHaveBeenCalledWith('Kelso', ['images']);
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockState.push).toHaveBeenCalledWith('/search/images?keyword=Kelso');
  });
});

describe('<Header> static page menus', () => {
  const help = { id: 1, slug: 'help', title: { en: 'Help', fr: 'Aide', de: '' } };
  const pages = [
    listItem('about-the-project', 'About the Project', null),
    listItem('how-to-use', 'How to use', 'help'),
    listItem('orphan', 'Orphan', 'deleted-heading'),
  ];

  function menuLinks(trigger: string) {
    const item = screen.getByRole('button', { name: trigger }).closest('li')!;
    return within(item)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
  }

  it('groups pages under their heading, keeping URLs under /about/', () => {
    mockState.siteFeatures = {
      sectionOrder: ['heading:help', 'about'],
      enabledSections: ['about'],
    };
    renderHeader({ pages, menuHeadings: [help] });

    expect(menuLinks('Help')).toEqual(['/about/how-to-use']);
    // A page whose heading no longer exists falls back under About.
    expect(menuLinks('about')).toEqual(['/about/about-the-project', '/about/orphan']);
  });

  it('places headings by the nav order and appends unplaced ones', () => {
    mockState.siteFeatures = {
      sectionOrder: ['heading:help', 'about'],
      enabledSections: ['about'],
    };
    const events = { id: 2, slug: 'events', title: { en: 'Events', fr: '', de: '' } };
    renderHeader({
      pages: [...pages, listItem('past-events', 'Past events', 'events')],
      menuHeadings: [help, events],
    });

    const triggers = screen
      .getAllByRole('button')
      .map((button) => button.textContent)
      .filter((text) => ['Help', 'about', 'Events'].includes(text ?? ''));
    expect(triggers).toEqual(['Help', 'about', 'Events']);
  });

  it('hides a heading with no published page', () => {
    mockState.siteFeatures = { sectionOrder: ['heading:help'], enabledSections: [] };
    renderHeader({ pages: [], menuHeadings: [help] });
    expect(screen.queryByRole('button', { name: 'Help' })).toBeNull();
  });
});
