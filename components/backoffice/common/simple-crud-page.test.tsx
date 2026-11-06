/** @vitest-environment jsdom */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { SimpleCrudPage } from './simple-crud-page';
import { renderWithQueryClient } from '@/test/render';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));

type Format = { id: number; name: string };
type Repo = { id: number; name: string; city: string };

const CITY_NAMES: Record<string, string> = { '1': 'Zurich', '2': 'Athens' };

function renderRepos(props: {
  createFn?: () => Promise<unknown>;
  updateFn?: () => Promise<unknown>;
}) {
  return renderWithQueryClient(
    <SimpleCrudPage<Repo>
      queryKey={['repos']}
      queryFn={async () => [
        { id: 1, name: 'BL', city: '1' },
        { id: 2, name: 'NLS', city: '2' },
      ]}
      createFn={props.createFn ?? vi.fn()}
      updateFn={props.updateFn ?? vi.fn()}
      deleteFn={vi.fn()}
      icon={Tag}
      title="Repositories"
      description="Repositories"
      singularLabel="Repository"
      pluralLabel="Repositories"
      searchColumn="name"
      fields={[
        { key: 'name', label: 'Name' },
        {
          key: 'city',
          label: 'City',
          required: false,
          parse: (value) => (value ? Number(value) : null),
          sortValue: (row) => CITY_NAMES[row.city],
          editor: ({ id, value, onChange, row }) => (
            <select
              id={id}
              aria-label={row ? `City of ${row.name}` : undefined}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">None</option>
              <option value="1">Zurich</option>
              <option value="2">Athens</option>
            </select>
          ),
        },
      ]}
      deleteDescription="Delete"
    />,
    { tooltip: true }
  );
}

const FORMATS: Format[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Format ${i + 1}`,
}));

describe('<SimpleCrudPage>', () => {
  it('shows 20 rows a page and pages through the rest', async () => {
    renderWithQueryClient(
      <SimpleCrudPage<Format>
        queryKey={['formats']}
        queryFn={async () => FORMATS}
        createFn={vi.fn()}
        updateFn={vi.fn()}
        deleteFn={vi.fn()}
        icon={Tag}
        title="Formats"
        description="Formats"
        singularLabel="Format"
        pluralLabel="Formats"
        searchColumn="name"
        fields={[{ key: 'name', label: 'Name' }]}
        deleteDescription="Delete"
      />,
      { tooltip: true }
    );

    expect(await screen.findByText('Format 20')).toBeTruthy();
    expect(screen.queryByText('Format 21')).toBeNull();
    expect(screen.getByText('1–20 of 25')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Format 25')).toBeTruthy();
    expect(screen.queryByText('Format 20')).toBeNull();
  });

  it("saves a field's own editor from the table and from the new dialog", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createFn = vi.fn().mockResolvedValue({});
    renderRepos({ createFn, updateFn });

    fireEvent.change(await screen.findByLabelText('City of BL'), { target: { value: '2' } });
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith(1, { city: 2 }));

    fireEvent.click(screen.getByRole('button', { name: 'New Repository' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bodleian' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ name: 'Bodleian', city: 1 }));
  });

  it("keeps focus on a field's editor after it saves", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    renderRepos({ updateFn });

    const city = await screen.findByLabelText('City of BL');
    city.focus();
    fireEvent.change(city, { target: { value: '2' } });
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith(1, { city: 2 }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.activeElement).toBe(screen.getByLabelText('City of BL'));
  });

  it('sorts a column by the text its editor shows, not by the stored value', async () => {
    renderRepos({});

    await screen.findByLabelText('City of BL');
    fireEvent.click(screen.getByRole('button', { name: /City/ }));

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent?.includes('NLS'))).toEqual([true, false]);
  });
});
