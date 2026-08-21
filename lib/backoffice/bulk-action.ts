import { toast } from 'sonner';

/**
 * Run a bulk action across many ids, ALWAYS invalidate the cache afterwards
 * (so partial successes show up in the UI), and toast the right outcome.
 *
 * The naive `await Promise.all(ids.map(fn))` pattern in the backoffice was
 * dropping cache invalidation on any failure — successes still committed
 * server-side but the table kept showing stale rows. `allSettled` + an
 * unconditional invalidate is the fix; this helper centralizes that.
 */
export async function runBulkAction<TId>(options: {
  ids: TId[];
  action: (id: TId) => Promise<unknown>;
  invalidate: () => void;
  /** Past-tense verb for the success toast: "deleted", "approved", "activated". */
  pastTense?: string;
  /** Singular noun for the toast: "user", "annotation", "comment". */
  noun?: string;
  /** Localized messages. Given these, pastTense/noun are unused — the English
   *  template can't produce correct agreement in other languages. */
  messages?: {
    success: (count: number) => string;
    allFailed: () => string;
    partial: (succeeded: number, failed: number) => string;
  };
}): Promise<{ succeeded: number; failed: number }> {
  const { ids, action, invalidate, pastTense = 'updated', noun = 'item', messages } = options;
  const results = await Promise.allSettled(ids.map((id) => action(id)));
  invalidate();

  const failed = results.filter((r) => r.status === 'rejected').length;
  const total = ids.length;
  const succeeded = total - failed;
  const plural = total === 1 ? noun : `${noun}s`;

  if (failed === 0) {
    toast.success(messages ? messages.success(total) : `${total} ${plural} ${pastTense}`);
  } else if (failed === total) {
    toast.error(messages ? messages.allFailed() : `Failed to update ${plural}`);
  } else {
    toast.warning(
      messages ? messages.partial(succeeded, failed) : `${succeeded} ${pastTense}, ${failed} failed`
    );
  }

  return { succeeded, failed };
}
