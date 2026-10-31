import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MenuHeading } from '@/lib/pages';
import { MenuHeadingsPanel } from './menu-headings-panel';
import { createTestQueryClient } from '@/test/query-client';

const services = vi.hoisted(() => ({
  getMenuHeadings: vi.fn(),
  createMenuHeading: vi.fn(),
  updateMenuHeading: vi.fn(),
  deleteMenuHeading: vi.fn(),
}));
vi.mock('@/services/backoffice/pages', () => services);

vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('next-intl', () => ({
  useLocale: () => 'fr',
  useTranslations: () => (key: string) => key,
}));

const help: MenuHeading = { id: 1, slug: 'help', title: { en: 'Help', fr: 'Aide', de: '' } };

function renderPanel() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MenuHeadingsPanel enabled />
    </QueryClientProvider>
  );
}

async function openNewHeadingDialog() {
  fireEvent.click(await screen.findByRole('button', { name: /pages\.headingNewButton/ }));
  const [titleEn, , , slug] = screen.getAllByRole('textbox');
  return { titleEn, slug };
}

const saveButton = () => screen.getByRole('button', { name: 'pagesDetail.saveButton' });

beforeEach(() => {
  vi.clearAllMocks();
  services.getMenuHeadings.mockResolvedValue([help]);
  services.createMenuHeading.mockResolvedValue(help);
});

describe('<MenuHeadingsPanel>', () => {
  it('lists the headings under their title in the backoffice language', async () => {
    renderPanel();
    expect(await screen.findByText('Aide')).toBeTruthy();
  });

  it('refuses a slug the backend would reject, before saving', async () => {
    renderPanel();
    const { titleEn, slug } = await openNewHeadingDialog();

    fireEvent.change(titleEn, { target: { value: 'Help me' } });
    fireEvent.change(slug, { target: { value: 'help me' } });

    expect(screen.getByText('pages.headingInvalidSlug')).toBeTruthy();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('refuses a reserved slug', async () => {
    renderPanel();
    const { titleEn, slug } = await openNewHeadingDialog();

    fireEvent.change(titleEn, { target: { value: 'About' } });
    fireEvent.change(slug, { target: { value: 'about' } });

    expect(screen.getByText('pages.headingReservedSlug')).toBeTruthy();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('creates a heading with the slug derived from the English title', async () => {
    renderPanel();
    const { titleEn } = await openNewHeadingDialog();

    fireEvent.change(titleEn, { target: { value: 'Help & FAQ' } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(services.createMenuHeading).toHaveBeenCalledWith({
        slug: 'help-faq',
        title: { en: 'Help & FAQ', fr: '', de: '' },
      })
    );
  });
});
