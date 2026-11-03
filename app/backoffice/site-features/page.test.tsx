/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLUMN_HEADERS_BY_TYPE } from '@/components/search/results-table';
import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { SEARCH_RESULT_TYPES } from '@/lib/search-types';
import { toast } from 'sonner';
import SiteFeaturesPage from './page';
import { renderWithQueryClient } from '@/test/render';
import { jsonResponse } from '@/test/responses';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

const SETTINGS_URL = '/api/proxy/api/v1/app-settings';

let getStatus: number;
let putResponse: Response | null;
let responseConfig: SiteFeaturesConfig;
const fetchMock = vi.fn();

beforeEach(() => {
  getStatus = 200;
  putResponse = null;
  responseConfig = getDefaultConfig();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
    // The page also lists the custom menu headings for the nav-order editor.
    String(input) === '/api/proxy/api/v1/management/menu-headings'
      ? new Response('[]', { status: 200 })
      : init?.method === 'PUT'
        ? (putResponse ?? new Response(String(init.body), { status: 200 }))
        : getStatus === 200
          ? new Response(JSON.stringify(responseConfig), { status: 200 })
          : new Response(JSON.stringify({ detail: 'unavailable' }), { status: getStatus })
  );
});

const renderPage = () => renderWithQueryClient(<SiteFeaturesPage />);

describe('<SiteFeaturesPage>', () => {
  it('shows an error state instead of an editable form full of defaults', async () => {
    getStatus = 500;
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

  it("reads Django's settings and saves the edited document back to it", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('switch', { name: 'searchCategoryImages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(put?.[0]).toBe(SETTINGS_URL);
    expect(JSON.parse(put?.[1].body).searchCategories.images.enabled).toBe(false);
    expect(fetchMock.mock.calls.some(([url, init]) => url === SETTINGS_URL && !init?.method)).toBe(
      true
    );
  });

  it("shows Django's reason when it refuses a save", async () => {
    putResponse = jsonResponse(
      { searchCategories: ['At least one search category must stay enabled.'] },
      400
    );
    renderPage();
    fireEvent.click(await screen.findByRole('switch', { name: 'searchCategoryImages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0][1]).toEqual({
      description: 'searchCategories: At least one search category must stay enabled.',
    });
  });
});
