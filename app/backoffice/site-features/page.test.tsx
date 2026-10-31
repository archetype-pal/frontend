/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';
import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { SEARCH_RESULT_TYPES } from '@/lib/search-types';
import { toast } from 'sonner';
import SiteFeaturesPage from './page';
import { createTestQueryClient } from '@/test/query-client';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

let getStatus: number;
let responseConfig: SiteFeaturesConfig;

beforeEach(() => {
  getStatus = 200;
  responseConfig = getDefaultConfig();
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) =>
    // The page also lists the custom menu headings for the nav-order editor.
    String(input).startsWith('/api/menu-headings')
      ? new Response('[]', { status: 200 })
      : getStatus === 200
        ? new Response(JSON.stringify(responseConfig), { status: 200 })
        : new Response(JSON.stringify({ error: 'unavailable' }), { status: getStatus })
  );
});

function renderPage() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SiteFeaturesPage />
    </QueryClientProvider>
  );
}

describe('<SiteFeaturesPage>', () => {
  it('shows an error state instead of an editable form full of defaults', async () => {
    getStatus = 503;
    renderPage();

    expect(await screen.findByText('Failed to load site customisation')).toBeTruthy();
    expect(screen.queryByText('Site Sections')).toBeNull();
  });

  it('renders the form when the read succeeds', async () => {
    renderPage();
    expect(await screen.findByText('Site Sections')).toBeTruthy();
  });

  it('renders the UI customization section with the default colours', async () => {
    renderPage();
    expect(await screen.findByText('UI Customization')).toBeTruthy();
    const defaults = getDefaultConfig().theme;
    // Each colour renders twice: the native swatch and the hex text input.
    // The header rows default to the same primary/foreground pair, so their
    // fields add 2 more matches apiece for those two values.
    expect(screen.getAllByDisplayValue(defaults.primaryColor)).toHaveLength(6);
    expect(screen.getAllByDisplayValue(defaults.primaryForegroundColor)).toHaveLength(6);
    expect(screen.getAllByDisplayValue(defaults.accentColor)).toHaveLength(2);
  });

  it('does not allow the last enabled search category to be switched off', async () => {
    for (const type of SEARCH_RESULT_TYPES) {
      responseConfig.searchCategories[type].enabled = type === 'manuscripts';
    }

    renderPage();
    const manuscriptsSwitch = await screen.findByRole('switch', { name: 'appManuscripts' });
    const imagesSwitch = screen.getByRole('switch', { name: 'searchCategoryImages' });

    expect((manuscriptsSwitch as HTMLButtonElement).disabled).toBe(true);
    expect((imagesSwitch as HTMLButtonElement).disabled).toBe(false);
  });

  it('blocks Save on an invalid theme colour instead of silently dropping it', async () => {
    renderPage();
    await screen.findByText('UI Customization');

    const backgroundColorInput = screen.getByRole('textbox', { name: 'Main background color' });
    fireEvent.change(backgroundColorInput, { target: { value: '#fff' } });

    expect(await screen.findByText('Enter a valid hex color, e.g. #075783.')).toBeTruthy();

    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('offers every implemented table column for search category configuration', async () => {
    renderPage();
    const manuscriptsButton = await screen.findByRole('button', { name: /appManuscripts/ });

    fireEvent.click(manuscriptsButton);

    for (const column of COLUMN_HEADERS_BY_TYPE.manuscripts) {
      expect(screen.getAllByText(column).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Format').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Display Label').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /searchCategoryImages/ }));

    for (const column of COLUMN_HEADERS_BY_TYPE.images) {
      expect(screen.getAllByText(column).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Date').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Locus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tags').length).toBeGreaterThan(0);
  });
});
