/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResultType } from '@/lib/search-types';
import Header from './header';

const mockState = vi.hoisted(() => ({
  enabledCategories: ['images'] as ResultType[],
  push: vi.fn(),
  loadGlobalSuggestions: vi.fn(),
  getServerSuggestions: vi.fn(async () => []),
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
  useAuth: () => ({ token: null, user: null, logout: vi.fn() }),
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
    config: { sectionOrder: ['search'], sections: { search: true }, searchCategories: {} },
    isSectionEnabled: (key: string) => key === 'search',
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

function renderHeader() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Header />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockState.enabledCategories = ['images'];
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
