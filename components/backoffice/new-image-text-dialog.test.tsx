/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewImageTextDialog } from './new-image-text-dialog';
import { createImageText, validateTei } from '@/services/image-texts';
import { renderWithQueryClient } from '@/test/render';

vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/image-texts', () => ({ createImageText: vi.fn(), validateTei: vi.fn() }));
vi.mock('@/services/backoffice/image-texts-list', () => ({
  fetchImageTextList: async () => ({
    results: [{ id: 31, item_image: 1658, type: 'Transcription' }],
  }),
}));

describe('<NewImageTextDialog>', () => {
  it('blocks a type the image already has and links to the existing text', async () => {
    renderWithQueryClient(
      <NewImageTextDialog open onOpenChange={() => {}} defaultItemImage={1658} />
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

describe('<NewImageTextDialog fromTeiFile>', () => {
  it('imports the file as the draft only once it validates', async () => {
    vi.mocked(validateTei)
      .mockResolvedValueOnce({ valid: false, errors: [{ line: 3, col: 1, message: 'unclosed' }] })
      .mockResolvedValueOnce({ valid: true, errors: [] });
    vi.mocked(createImageText).mockResolvedValue({ id: 7, type: 'Translation' } as never);
    renderWithQueryClient(
      <NewImageTextDialog
        fromTeiFile
        open
        onOpenChange={() => {}}
        defaultItemImage={99}
        defaultType="Translation"
      />
    );
    const file = screen.getByLabelText('TEI file');
    const submit = () => screen.getByRole('button', { name: 'Import draft' }) as HTMLButtonElement;

    fireEvent.change(file, { target: { files: [new File(['<TEI>'], 'bad.xml')] } });
    expect(await screen.findByText('Line 3: unclosed')).toBeTruthy();
    expect(submit().disabled).toBe(true);

    fireEvent.change(file, { target: { files: [new File(['<TEI/>'], 'good.xml')] } });
    await screen.findByText('Valid TEI');
    fireEvent.click(submit());

    await waitFor(() =>
      expect(createImageText).toHaveBeenCalledWith(
        expect.objectContaining({ item_image: 99, type: 'Translation', content: '<TEI/>' })
      )
    );
  });
});
