import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from './data-table';

type Row = { id: number; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];

describe('DataTable error state', () => {
  it('renders an error row + Retry when isError, instead of rows or the empty state', () => {
    const onRetry = vi.fn();
    render(<DataTable columns={columns} data={[]} isError onRetry={onRetry} pagination={false} />);

    expect(screen.queryByText(/failed to load/i)).not.toBeNull();
    expect(screen.queryByText('No results.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders "No results." (not the error) when not errored and data is empty', () => {
    render(<DataTable columns={columns} data={[]} pagination={false} />);

    expect(screen.queryByText('No results.')).not.toBeNull();
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });

  it('renders rows when data is present (no error)', () => {
    render(<DataTable columns={columns} data={[{ id: 1, name: 'Alpha' }]} pagination={false} />);

    expect(screen.queryByText('Alpha')).not.toBeNull();
    expect(screen.queryByText(/failed to load/i)).toBeNull();
  });
});
