import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { runBulkAction } from './bulk-action';

const toastMocks = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  toastMocks.success.mockReset();
  toastMocks.error.mockReset();
  toastMocks.warning.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('runBulkAction', () => {
  it('toasts success and invalidates when every action resolves', async () => {
    const invalidate = vi.fn();
    const action = vi.fn().mockResolvedValue(undefined);
    const result = await runBulkAction({
      ids: [1, 2, 3],
      action,
      invalidate,
      pastTense: 'deleted',
      noun: 'comment',
    });
    expect(result).toEqual({ succeeded: 3, failed: 0 });
    expect(action).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(toastMocks.success).toHaveBeenCalledWith('3 comments deleted');
    expect(toastMocks.warning).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('still invalidates when ALL actions reject — partial successes used to be lost', async () => {
    // The original `Promise.all` short-circuit dropped the invalidate step.
    // The fix is unconditional invalidation, even on total failure (the
    // server may still have committed something the user needs to see).
    const invalidate = vi.fn();
    const action = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await runBulkAction({
      ids: [1, 2],
      action,
      invalidate,
      pastTense: 'deleted',
      noun: 'user',
    });
    expect(result).toEqual({ succeeded: 0, failed: 2 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(toastMocks.error).toHaveBeenCalledWith('Failed to update users');
  });

  it('toasts a partial-success warning when only some reject', async () => {
    const invalidate = vi.fn();
    const action = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const result = await runBulkAction({
      ids: [1, 2, 3],
      action,
      invalidate,
      pastTense: 'activated',
      noun: 'user',
    });
    expect(result).toEqual({ succeeded: 2, failed: 1 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(toastMocks.warning).toHaveBeenCalledWith('2 activated, 1 failed');
  });

  it('uses the singular noun when there is only one id', async () => {
    const invalidate = vi.fn();
    await runBulkAction({
      ids: [1],
      action: () => Promise.resolve(),
      invalidate,
      pastTense: 'deleted',
      noun: 'annotation',
    });
    expect(toastMocks.success).toHaveBeenCalledWith('1 annotation deleted');
  });
});
