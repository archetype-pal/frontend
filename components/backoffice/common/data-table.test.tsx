import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, onTestFinished, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { listAllPages } from '@/lib/backoffice/list-all-pages';
import { DataTable, sortableHeader, type BulkAction } from './data-table';

const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn() } }));
vi.mock('sonner', () => ({ toast }));

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

  it('shows how many rows it has read while it exports every row', async () => {
    const downloaded = stubDownload();
    let finish!: () => void;
    const fetchAllRows = vi.fn(
      async ({ onProgress }: { onProgress: (loaded: number, total: number) => void }) => {
        onProgress(100, 300);
        await new Promise<void>((resolve) => (finish = resolve));
        return rows;
      }
    );
    render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        enableExport
        fetchAllRows={fetchAllRows}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    const button = await screen.findByRole('button', { name: 'Exporting 100 of 300…' });
    expect(button).toHaveProperty('disabled', true);
    finish();
    expect(await downloaded()).toBe('name\nBeta\nAlpha');
    await screen.findByRole('button', { name: 'Export' });
  });

  it('stops a running export when the table goes away, without a download or an error', async () => {
    const downloaded = stubDownload();
    let finishPage!: () => void;
    const list = vi.fn(async () => {
      await new Promise<void>((resolve) => (finishPage = resolve));
      return { count: 300, next: null, previous: null, results: rows };
    });
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        enableExport
        fetchAllRows={(options) => listAllPages(list, options)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    unmount();
    finishPage();

    await expect(downloaded()).rejects.toThrow();
    expect(list).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('exports only the ticked rows in list order, page by page, even after going back to an earlier page', async () => {
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
    const tick = (index: number) =>
      fireEvent.click(screen.getAllByRole('checkbox', { name: /select row/i })[index]);
    const firstPage: Row[] = [
      { id: 3, name: 'Gamma' },
      { id: 4, name: 'Delta' },
    ];
    const { rerender } = render(table(firstPage));

    tick(0);
    rerender(
      table([
        { id: 2, name: 'Beta' },
        { id: 1, name: 'Alpha' },
      ])
    );
    tick(1);
    tick(0);
    rerender(table(firstPage));
    tick(1);
    fireEvent.click(screen.getByRole('button', { name: /export 4 selected/i }));

    expect(await downloaded()).toBe('name\nGamma\nDelta\nBeta\nAlpha');
    expect(fetchAllRows).not.toHaveBeenCalled();
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

describe('DataTable bulk actions', () => {
  const tick = (index: number) =>
    fireEvent.click(screen.getAllByRole('checkbox', { name: /select row/i })[index]);
  const table = (action: BulkAction['action'], data: Row[]) => (
    <DataTable
      columns={columns}
      data={data}
      pagination={false}
      enableRowSelection
      enableExport
      bulkActions={[{ label: 'Run', action }]}
    />
  );

  it('keeps ticked only the rows the action hands back, on every page', async () => {
    const downloaded = stubDownload();
    const action = vi.fn<BulkAction['action']>((_ids, keepTicked) => keepTicked(['3']));
    const { rerender } = render(
      table(action, [
        { id: 1, name: 'Beta' },
        { id: 3, name: 'Gamma' },
      ])
    );
    tick(0);
    tick(1);
    rerender(table(action, [{ id: 2, name: 'Alpha' }]));
    tick(0);

    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect([...action.mock.calls[0][0]].sort()).toEqual(['1', '2', '3']);
    expect(screen.queryByText('1 selected')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /export 1 selected/i }));
    expect(await downloaded()).toBe('name\nGamma');
  });

  it('keeps the ticks when the action does not clear them', () => {
    render(table(vi.fn(), [{ id: 1, name: 'Beta' }]));

    tick(0);
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    expect(screen.queryByText('1 selected')).not.toBeNull();
  });
});

describe('DataTable client pagination', () => {
  const many: Row[] = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

  it('keeps the page when the data refreshes and returns to page 1 on search', () => {
    const { rerender } = render(<DataTable columns={columns} data={many} searchColumn="name" />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByText('Row 21')).not.toBeNull();

    rerender(
      <DataTable columns={columns} data={many.map((row) => ({ ...row }))} searchColumn="name" />
    );
    expect(screen.queryByText('Row 21')).not.toBeNull();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Row 4' } });
    expect(screen.queryByText('Row 4')).not.toBeNull();
  });
});
