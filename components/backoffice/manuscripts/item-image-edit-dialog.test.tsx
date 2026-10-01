/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { ItemPartImage } from '@/types/backoffice';

const updateItemImageMock = vi.fn();
vi.mock('@/services/backoffice/manuscripts', () => ({
  updateItemImage: (...args: unknown[]) => updateItemImageMock(...args),
  deleteItemImage: vi.fn(),
}));

const searchItemPartsMock = vi.fn();
vi.mock('@/services/tei-ref-search', () => ({
  searchItemParts: (...args: unknown[]) => searchItemPartsMock(...args),
}));

vi.mock('@/components/backoffice/common/iiif-thumbnail', () => ({
  IiifThumbnail: () => null,
}));

import { ItemImageEditDialog } from './item-image-edit-dialog';

const IMAGE: ItemPartImage = {
  id: 1,
  image: null,
  image_path: 'uploads/f1r.jp2',
  locus: 'f.1r',
  tags: [],
  text_count: 0,
};

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ItemImageEditDialog
        open
        onOpenChange={() => {}}
        image={IMAGE}
        historicalItemId={3}
        itemPartId={5}
        itemPartLabel="Current part"
      />
    </QueryClientProvider>
  );
  return { invalidateSpy };
}

beforeEach(() => {
  updateItemImageMock.mockReset();
  updateItemImageMock.mockResolvedValue({});
  searchItemPartsMock.mockReset();
  searchItemPartsMock.mockResolvedValue([
    { id: 5, display_label: 'Current part', number_of_images: 3 },
    { id: 9, display_label: 'Cotton Ch. 1', number_of_images: 2 },
  ]);
});

describe('ItemImageEditDialog item part', () => {
  it('does not send item_part when the part is unchanged', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateItemImageMock).toHaveBeenCalledTimes(1));
    expect(updateItemImageMock.mock.calls[0][1]).not.toHaveProperty('item_part');
  });

  it('moves the image to the part picked from the search', async () => {
    const { invalidateSpy } = renderDialog();

    fireEvent.click(screen.getByText('Current part').closest('button')!);
    fireEvent.change(screen.getByPlaceholderText('Search manuscripts…'), {
      target: { value: 'cotton' },
    });
    const option = await screen.findByRole('option', { name: /Cotton Ch\. 1/ });
    // The part the image is already on is not offered as a destination.
    expect(screen.queryByRole('option', { name: /Current part/ })).toBeNull();

    fireEvent.click(option);
    expect(screen.getByText('Saving moves this image to Cotton Ch. 1.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateItemImageMock).toHaveBeenCalledWith(1, expect.objectContaining({ item_part: 9 }))
    );
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.manuscripts.all() })
    );
  });

  it('tells apart parts that share a label', async () => {
    searchItemPartsMock.mockResolvedValue([
      { id: 1, display_label: 'BL Add. Ch. 1', number_of_images: 1 },
      { id: 26, display_label: 'BL Add. Ch. 1', number_of_images: 0, date: '1080s' },
    ]);
    renderDialog();

    fireEvent.click(screen.getByText('Current part').closest('button')!);
    fireEvent.change(screen.getByPlaceholderText('Search manuscripts…'), {
      target: { value: 'bl' },
    });

    expect(await screen.findByText('#1 · 1 image')).toBeTruthy();
    expect(screen.getByText('#26 · 0 images · 1080s')).toBeTruthy();
  });
});
