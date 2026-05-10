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
  pastTense: string;
  /** Singular noun for the toast: "user", "annotation", "comment". */
  noun: string;
}): Promise<{ succeeded: number; failed: number }> {
  const { ids, action, invalidate, pastTense, noun } = options;
  const results = await Promise.allSettled(ids.map((id) => action(id)));
  invalidate();

  const failed = results.filter((r) => r.status === 'rejected').length;
  const total = ids.length;
  const succeeded = total - failed;
  const plural = total === 1 ? noun : `${noun}s`;

  if (failed === 0) {
    toast.success(`${total} ${plural} ${pastTense}`);
  } else if (failed === total) {
    toast.error(`Failed to update ${plural}`);
  } else {
    toast.warning(`${succeeded} ${pastTense}, ${failed} failed`);
  }

  return { succeeded, failed };
}
