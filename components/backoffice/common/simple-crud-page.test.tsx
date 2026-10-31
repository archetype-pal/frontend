/** @vitest-environment jsdom */
import { fireEvent, screen } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { SimpleCrudPage } from './simple-crud-page';
import { renderWithQueryClient } from '@/test/render';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));

type Format = { id: number; name: string };

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
});
