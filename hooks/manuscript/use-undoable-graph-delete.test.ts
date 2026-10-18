import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UNDO_WINDOW_MS, useUndoableGraphDelete } from './use-undoable-graph-delete';

const deleteMock = vi.hoisted(() => vi.fn());
vi.mock('@/services/annotations', () => ({ deleteViewerAnnotation: deleteMock }));

function setup(isAuthenticated = true) {
  const callbacks = {
    onHide: vi.fn(),
    onRestore: vi.fn(),
    onDeleted: vi.fn(),
    onFailed: vi.fn(),
  };
  const hook = renderHook(() => useUndoableGraphDelete({ isAuthenticated, ...callbacks }));
  return { ...callbacks, hook, api: () => hook.result.current };
}

beforeEach(() => {
  vi.useFakeTimers();
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useUndoableGraphDelete', () => {
  it('hides the graph at once and sends the delete when the undo window ends', async () => {
    const { api, onHide, onDeleted } = setup();

    act(() => api().remove(7));
    expect(onHide).toHaveBeenCalledWith(7);
    expect(deleteMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    });
    expect(deleteMock).toHaveBeenCalledWith(7, { keepalive: true });
    expect(onDeleted).toHaveBeenCalledWith(7);
  });

  it('puts the graph back and sends nothing when undone in time', async () => {
    const { api, onRestore } = setup();

    act(() => api().remove(7));
    let undone = false;
    act(() => {
      undone = api().undo(7);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    });

    expect(undone).toBe(true);
    expect(onRestore).toHaveBeenCalledWith(7);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('cannot undo a delete that has been sent', async () => {
    const { api, onRestore } = setup();

    act(() => api().remove(7));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    });

    expect(api().undo(7)).toBe(false);
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('puts the graph back when the delete fails', async () => {
    deleteMock.mockRejectedValue(new Error('500'));
    const { api, onRestore, onFailed, onDeleted } = setup();

    act(() => api().remove(7));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    });

    expect(onRestore).toHaveBeenCalledWith(7);
    expect(onFailed).toHaveBeenCalledWith(7);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('sends a waiting delete straight away when the page is left', () => {
    const { api } = setup();

    act(() => api().remove(7));
    window.dispatchEvent(new Event('pagehide'));

    expect(deleteMock).toHaveBeenCalledWith(7, { keepalive: true });
  });

  it('sends a waiting delete straight away when the gallery unmounts', () => {
    const { api, hook } = setup();

    act(() => api().remove(7));
    hook.unmount();

    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
