/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewImageTextDialog } from './new-image-text-dialog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/backoffice/image-texts-list', () => ({
  fetchImageTextList: async () => ({
    results: [{ id: 31, item_image: 1658, type: 'Transcription' }],
  }),
}));

describe('<NewImageTextDialog>', () => {
  it('blocks a type the image already has and links to the existing text', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <NewImageTextDialog open onOpenChange={() => {}} defaultItemImage={1658} />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/Image 1658 already has a transcription/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit the existing one' }).getAttribute('href')).toBe(
      '/backoffice/image-texts/31'
    );
    expect(
      (screen.getByRole('button', { name: 'Create draft' }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
