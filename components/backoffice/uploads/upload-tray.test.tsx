import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadTray } from './upload-tray';
import { useUploadManager, type UploadItem } from '@/contexts/upload-manager-context';

vi.mock('@/contexts/upload-manager-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/upload-manager-context')>();
  return { ...actual, useUploadManager: vi.fn() };
});

const cancel = vi.fn();
const dismiss = vi.fn();

const item = (over: Partial<UploadItem>): UploadItem => ({
  id: 'i1',
  file: new File(['x'], 'f12r.tif'),
  fileName: 'f12r.tif',
  itemPartId: 3,
  itemPartLabel: 'MS A, part 1',
  historicalItemId: 7,
  locus: 'f.12r',
  tags: '',
  status: 'uploading',
  phase: 'uploading',
  sentBytes: 1,
  totalBytes: 4,
  message: '',
  error: '',
  ...over,
});

function renderTray(over: Partial<UploadItem>) {
  vi.mocked(useUploadManager).mockReturnValue({
    items: [item(over)],
    activeCount: 1,
    interrupted: [],
    enqueue: vi.fn(),
    cancel,
    retry: vi.fn(),
    dismiss,
    clearFinished: vi.fn(),
    resumeInterrupted: vi.fn(),
    dismissInterrupted: vi.fn(),
  });
  render(<UploadTray />);
}

beforeEach(() => vi.clearAllMocks());

describe('upload tray X button', () => {
  it('cancels bytes in flight, but only stops tracking once finalize has started', () => {
    renderTray({ phase: 'uploading' });
    fireEvent.click(screen.getByLabelText('Cancel upload of f12r.tif'));
    expect(cancel).toHaveBeenCalledWith('i1');

    // Same status, later phase: finalize is already assembling server-side, so
    // a DELETE would either lose the race or corrupt it.
    cleanup();
    renderTray({ phase: 'finalizing' });
    expect(screen.queryByLabelText('Cancel upload of f12r.tif')).toBeNull();
    fireEvent.click(screen.getByLabelText('Stop tracking f12r.tif'));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledWith('i1');
  });

  it('drops a queued upload instead of trapping it behind a disabled button', () => {
    renderTray({ status: 'pending', phase: null });
    fireEvent.click(screen.getByLabelText('Cancel upload of f12r.tif'));
    expect(cancel).toHaveBeenCalledWith('i1');
  });

  it('only stops tracking once the server is converting — that cannot be cancelled', () => {
    renderTray({ status: 'processing', phase: 'processing' });
    expect(screen.queryByLabelText('Cancel upload of f12r.tif')).toBeNull();
    fireEvent.click(screen.getByLabelText('Stop tracking f12r.tif'));
    expect(cancel).not.toHaveBeenCalled();
    expect(dismiss).toHaveBeenCalledWith('i1');
  });
});
