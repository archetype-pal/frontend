/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tag } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { SimpleCrudPage } from './simple-crud-page';
import { createTestQueryClient } from '@/test/query-client';

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Format = { id: number; name: string };

const FORMATS: Format[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Format ${i + 1}`,
}));

describe('<SimpleCrudPage>', () => {
  it('shows 20 rows a page and pages through the rest', async () => {
    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <SimpleCrudPage<Format>
            queryKey={['formats']}
            queryFn={async () => FORMATS}
            getRows={(data) => (data as Format[] | undefined) ?? []}
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
          />
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Format 20')).toBeTruthy();
    expect(screen.queryByText('Format 21')).toBeNull();
    expect(screen.getByText('1–20 of 25')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Format 25')).toBeTruthy();
    expect(screen.queryByText('Format 20')).toBeNull();
  });
});
