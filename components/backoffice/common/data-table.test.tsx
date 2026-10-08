import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, onTestFinished, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable, sortableHeader } from './data-table';

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

function stubDownload() {
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:export');
  const { createObjectURL: originalCreate, revokeObjectURL: originalRevoke } = URL;
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = vi.fn();
  onTestFinished(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
  return async () => {
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    return createObjectURL.mock.calls[0][0].text();
  };
}

describe('DataTable server sorting and export', () => {
  const rows: Row[] = [
    { id: 1, name: 'Beta' },
    { id: 2, name: 'Alpha' },
  ];

  it('reports sorting changes and keeps the server row order', () => {
    const onSortingChange = vi.fn();
    render(
      <DataTable
        columns={[{ accessorKey: 'name', header: sortableHeader('Name') }]}
        data={rows}
        pagination={false}
        sorting={[{ id: 'name', desc: false }]}
        onSortingChange={onSortingChange}
      />
    );

    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Beta', 'Alpha']);
    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: true }]);
  });

  it('exports the rows returned by fetchAllRows, not just the visible page', async () => {
    const downloaded = stubDownload();
    const fetchAllRows = vi.fn().mockResolvedValue([...rows, { id: 3, name: 'Gamma' }]);
    render(
      <DataTable
        columns={columns}
        data={rows.slice(0, 1)}
        pagination={false}
        enableExport
        fetchAllRows={fetchAllRows}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    expect(await downloaded()).toBe('name\nBeta\nAlpha\nGamma');
  });

  it('exports only the ticked rows, including one ticked on an earlier page', async () => {
    const downloaded = stubDownload();
    const fetchAllRows = vi.fn();
    const table = (data: Row[]) => (
      <DataTable
        columns={columns}
        data={data}
        pagination={false}
        enableRowSelection
        enableExport
        fetchAllRows={fetchAllRows}
      />
    );
    const { rerender } = render(table([rows[0]]));

    fireEvent.click(screen.getByRole('checkbox', { name: /select row/i }));
    rerender(table([rows[1]]));
    fireEvent.click(screen.getByRole('button', { name: /export 1 selected/i }));

    expect(await downloaded()).toBe('name\nBeta');
    expect(fetchAllRows).not.toHaveBeenCalled();
  });

  it('stops a running export when the table goes away', async () => {
    const downloaded = stubDownload();
    let reportPage: (loaded: number, total: number) => void = () => {};
    let finishPage: () => void = () => {};
    const fetchAllRows = vi.fn(async (onProgress: (loaded: number, total: number) => void) => {
      reportPage = onProgress;
      await new Promise<void>((resolve) => (finishPage = resolve));
      onProgress(100, 300);
      return rows;
    });
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        enableExport
        fetchAllRows={fetchAllRows}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => expect(fetchAllRows).toHaveBeenCalled());
    unmount();
    finishPage();

    await expect(downloaded()).rejects.toThrow();
    expect(() => reportPage(200, 300)).toThrow('unmounted');
  });

  it('offers Export only once a row is ticked when limited to the selection', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        enableRowSelection
        enableExport
        exportSelectionOnly
      />
    );

    expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    fireEvent.click(screen.getAllByRole('checkbox', { name: /select row/i })[0]);
    expect(screen.queryByRole('button', { name: /export 1 selected/i })).not.toBeNull();
  });
});

describe('DataTable client pagination', () => {
  const many: Row[] = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

  it('keeps the page when the data refreshes and returns to page 1 on search', () => {
    const { rerender } = render(<DataTable columns={columns} data={many} searchColumn="name" />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(screen.queryByText('Row 21')).not.toBeNull();

    rerender(
      <DataTable columns={columns} data={many.map((row) => ({ ...row }))} searchColumn="name" />
    );
    expect(screen.queryByText('Row 21')).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Row 4' } });
    expect(screen.queryByText('Row 4')).not.toBeNull();
  });
});
