import { toast } from 'sonner';

interface BulkActionMessages {
  success: (count: number) => string;
  allFailed: () => string;
  partial: (succeeded: number, failed: number) => string;
}

type BulkActionOptions<TId> = {
  ids: TId[];
  action: (id: TId) => Promise<unknown>;
  invalidate: () => void;
} & (
  | {
      /** Fully-formed localized messages. Preferred: the English template below
       *  concatenates, which can't agree correctly in languages that inflect. */
      messages: BulkActionMessages;
    }
  | {
      /** Past-tense verb for the success toast: "deleted", "approved", "activated". */
      pastTense: string;
      /** Singular noun for the toast: "user", "annotation", "comment". */
      noun: string;
    }
);

/**
 * Run a bulk action across many ids, ALWAYS invalidate the cache afterwards
 * (so partial successes show up in the UI), and toast the right outcome.
 *
 * The naive `await Promise.all(ids.map(fn))` pattern in the backoffice was
 * dropping cache invalidation on any failure — successes still committed
 * server-side but the table kept showing stale rows. `allSettled` + an
 * unconditional invalidate is the fix; this helper centralizes that.
 *
 * Callers supply either `messages` or the `pastTense`/`noun` pair — the union
 * makes omitting both a type error rather than a silent "3 items updated".
 */
export async function runBulkAction<TId>(
  options: BulkActionOptions<TId>
): Promise<{ succeeded: number; failed: number }> {
  const { ids, action, invalidate } = options;
  const results = await Promise.allSettled(ids.map((id) => action(id)));
  invalidate();

  const failed = results.filter((r) => r.status === 'rejected').length;
  const total = ids.length;
  const succeeded = total - failed;

  if ('messages' in options) {
    const { messages } = options;
    if (failed === 0) {
      toast.success(messages.success(total));
    } else if (failed === total) {
      toast.error(messages.allFailed());
    } else {
      toast.warning(messages.partial(succeeded, failed));
    }
    return { succeeded, failed };
  }

  const { pastTense, noun } = options;
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
