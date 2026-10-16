/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { TextsList } from './texts-list';

const { fetchImageTextList, proxyFetch } = vi.hoisted(() => ({
  fetchImageTextList: vi.fn(),
  proxyFetch: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api-fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-fetch')>()),
  proxyFetch,
}));
vi.mock('@/services/backoffice/image-texts-list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/backoffice/image-texts-list')>()),
  fetchImageTextList,
}));

// Radix menus need pointer capture APIs jsdom lacks: render the export menu inline.
vi.mock('@/components/ui/dropdown-menu', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

function text(id: number) {
  return {
    id,
    item_image: 10 + id,
    item_part_id: 1,
    item_image_locus: `f. ${id}r`,
    item_image_label: `Image ${id}`,
    content: '',
    char_count: 0,
    is_empty: true,
    type: 'Transcription',
    status: 'Draft',
    language: 'la',
    review_assignee: null,
    review_assignee_username: null,
    last_transition: null,
    created: '2026-01-01T00:00:00Z',
    modified: '2026-01-01T00:00:00Z',
  };
}

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TextsList />
    </QueryClientProvider>
  );
}

function exportQuery() {
  const path: string = proxyFetch.mock.calls[0][0];
  return new URLSearchParams(path.split('?')[1]);
}

describe('<TextsList> export', () => {
  beforeEach(() => {
    fetchImageTextList.mockReset();
    proxyFetch.mockReset();
    fetchImageTextList.mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [text(1), text(2), text(3)],
    });
    proxyFetch.mockResolvedValue({ ok: true, blob: async () => new Blob(['x']) });
    const { createObjectURL, revokeObjectURL } = URL;
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    onTestFinished(() => {
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
    });
  });

  it('exports only the ticked texts when some are ticked, and says so', async () => {
    renderList();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select image-text 2' }));
    expect(screen.getByRole('button', { name: /Export 1 selected/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'JSON (selected texts)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'CSV (all matching rows)' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'CSV (selected texts)' }));

    await waitFor(() => expect(proxyFetch).toHaveBeenCalledTimes(1));
    expect(exportQuery().get('id__in')).toBe('2');
  });

  it('exports every matching text as CSV when none is ticked', async () => {
    renderList();
    await screen.findByRole('checkbox', { name: 'Select image-text 2' });

    fireEvent.click(screen.getByRole('button', { name: 'CSV (all matching rows)' }));

    await waitFor(() => expect(proxyFetch).toHaveBeenCalledTimes(1));
    expect(exportQuery().has('id__in')).toBe(false);
    expect(exportQuery().get('export_format')).toBe('csv');
    expect(exportQuery().has('format')).toBe(false);
  });
});
