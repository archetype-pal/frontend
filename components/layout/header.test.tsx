/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageListItem } from '@/lib/pages';
import type { ResultType } from '@/lib/search-types';
import Header from './header';
import { renderWithQueryClient } from '@/test/render';

const mockState = vi.hoisted(() => ({
  enabledCategories: ['images'] as ResultType[],
  push: vi.fn(),
  loadGlobalSuggestions: vi.fn(),
  getServerSuggestions: vi.fn(async () => []),
  siteFeatures: {
    sectionOrder: ['search'] as string[],
    enabledSections: ['search'] as string[],
  },
  getAgentTools: vi.fn(),
  getLearnStatus: vi.fn(),
  getDiplomaticSummary: vi.fn(),
}));

vi.mock('@/services/agent', () => ({ getAgentTools: mockState.getAgentTools }));
vi.mock('@/services/learn', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/learn')>()),
  getLearnStatus: mockState.getLearnStatus,
}));
vi.mock('@/services/diplomatic', () => ({
  getDiplomaticSummary: mockState.getDiplomaticSummary,
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
  return renderWithQueryClient(<Header {...props} />);
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
  mockState.getAgentTools.mockReset().mockResolvedValue({ enabled: false, tools: [] });
  mockState.getLearnStatus.mockReset().mockResolvedValue({ enabled: false });
  mockState.getDiplomaticSummary
    .mockReset()
    .mockResolvedValue({ formulae: 0, entities: 0, relations: 0 });
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

  it("keeps a custom heading's menu when the About section is off", () => {
    mockState.siteFeatures = { sectionOrder: ['heading:help', 'about'], enabledSections: [] };
    renderHeader({ pages, menuHeadings: [help] });

    expect(menuLinks('Help')).toEqual(['/about/how-to-use']);
    expect(screen.queryByRole('button', { name: 'about' })).toBeNull();
  });

  it('hides a heading with no published page', () => {
    mockState.siteFeatures = { sectionOrder: ['heading:help'], enabledSections: [] };
    renderHeader({ pages: [], menuHeadings: [help] });
    expect(screen.queryByRole('button', { name: 'Help' })).toBeNull();
  });
});

describe('<Header> Research menu', () => {
  const researchLinks = () => {
    const trigger = screen.queryByRole('button', { name: 'research' });
    if (!trigger) return null;
    return within(trigger.closest('li')!)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]);
  };
  const settled = () =>
    waitFor(() => {
      expect(mockState.getAgentTools).toHaveBeenCalled();
      expect(mockState.getLearnStatus).toHaveBeenCalled();
      expect(mockState.getDiplomaticSummary).toHaveBeenCalled();
    });

  it('lists Ask Archetype while the agent is switched on', async () => {
    mockState.getAgentTools.mockResolvedValue({ enabled: true, tools: [] });
    renderHeader();

    await screen.findByRole('button', { name: 'research' });
    expect(researchLinks()).toEqual([['ask', '/ask']]);
  });

  it('lists the palaeography tutor while it is switched on', async () => {
    mockState.getLearnStatus.mockResolvedValue({ enabled: true });
    renderHeader();

    await screen.findByRole('button', { name: 'research' });
    expect(researchLinks()).toEqual([['learn', '/learn']]);
    // Whether it is on is the same for everyone, so the header asks anonymously.
    expect(mockState.getLearnStatus).toHaveBeenCalledWith(false);
  });

  it('lists the formulary once a formula has been approved', async () => {
    mockState.getDiplomaticSummary.mockResolvedValue({ formulae: 3, entities: 0, relations: 0 });
    renderHeader();

    await screen.findByRole('button', { name: 'research' });
    expect(researchLinks()).toEqual([['formulary', '/formulary']]);
  });

  it.each([
    ['an entity', { formulae: 0, entities: 1, relations: 0 }],
    ['a relation', { formulae: 0, entities: 0, relations: 1 }],
  ])('lists the network once %s has been approved', async (_, summary) => {
    mockState.getDiplomaticSummary.mockResolvedValue(summary);
    renderHeader();

    await screen.findByRole('button', { name: 'research' });
    expect(researchLinks()).toEqual([['network', '/network']]);
  });

  it('lists all four, Ask Archetype and the tutor first', async () => {
    mockState.getAgentTools.mockResolvedValue({ enabled: true, tools: [] });
    mockState.getLearnStatus.mockResolvedValue({ enabled: true });
    mockState.getDiplomaticSummary.mockResolvedValue({ formulae: 1, entities: 2, relations: 0 });
    renderHeader();

    await waitFor(() => expect(researchLinks()).toHaveLength(4));
    expect(researchLinks()).toEqual([
      ['ask', '/ask'],
      ['learn', '/learn'],
      ['formulary', '/formulary'],
      ['network', '/network'],
    ]);
  });

  it('is absent while there is nothing to list', async () => {
    renderHeader();

    await settled();
    expect(researchLinks()).toBeNull();
  });

  it('is absent when none can be asked', async () => {
    mockState.getAgentTools.mockRejectedValue(new Error('502'));
    mockState.getLearnStatus.mockRejectedValue(new Error('502'));
    mockState.getDiplomaticSummary.mockRejectedValue(new Error('502'));
    renderHeader();

    await settled();
    expect(researchLinks()).toBeNull();
  });
});
