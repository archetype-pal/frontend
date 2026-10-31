/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewImageTextDialog } from './new-image-text-dialog';
import { createTestQueryClient } from '@/test/query-client';

vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/image-texts-list', () => ({
  fetchImageTextList: async () => ({
    results: [{ id: 31, item_image: 1658, type: 'Transcription' }],
  }),
}));

describe('<NewImageTextDialog>', () => {
  it('blocks a type the image already has and links to the existing text', async () => {
    const client = createTestQueryClient();
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
