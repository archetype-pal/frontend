/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Image as ImageIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));

import { OrderedItemsPage } from './ordered-items-page';
import { renderWithQueryClient } from '@/test/render';

type Item = { id: number; ordering: number; title: string };

const ITEMS: Item[] = [
  { id: 1, ordering: 1, title: 'First' },
  { id: 2, ordering: 2, title: 'Second' },
];

describe('<OrderedItemsPage>', () => {
  it("deletes the item open in the editor through the page's confirmation", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    renderWithQueryClient(
      <OrderedItemsPage<Item, never>
        messages="carousel"
        icon={ImageIcon}
        queryKey={['ordered-items-test']}
        list={async () => ITEMS}
        create={vi.fn()}
        update={vi.fn()}
        updateOrdering={vi.fn()}
        remove={remove}
        deleteTitle={(item) => `Delete ${item.title}?`}
        renderCard={({ item, onSelect }) => (
          <button key={item.id} onClick={() => onSelect(item)}>
            {item.title}
          </button>
        )}
        renderEditor={({ item }) => <p>Editing {item?.title}</p>}
        renderPreview={() => <p>Preview</p>}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Second' }));
    expect(screen.getByText('Editing Second')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete item' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete Second?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(2, expect.anything()));
    await waitFor(() => expect(screen.getByText('Preview')).toBeTruthy());
  });
});
