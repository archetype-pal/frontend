/**
 * Filter state → query params for the backoffice Trash list.
 *
 * `<input type="datetime-local">` yields a naive local string, but the backend
 * runs in UTC — sent raw, "14:30" would be read as 14:30 UTC. `toISOString()`
 * converts local → UTC and emits the "Z" form, which also keeps a "+" offset
 * out of the query string (where it would decode to a space).
 */

export const ALL = '__all';

export interface TrashFilterState {
  /** Graph annotation_type, or ALL. */
  annotationType: string;
  /** Username of whoever trashed the row, or ALL. */
  deletedBy: string;
  /** datetime-local value: trashed at or after this instant. */
  deletedFrom: string;
  /** datetime-local value: trashed at or before this instant. */
  deletedTo: string;
}

export const EMPTY_TRASH_FILTERS: TrashFilterState = {
  annotationType: ALL,
  deletedBy: ALL,
  deletedFrom: '',
  deletedTo: '',
};

/** A `datetime-local` value as an ISO/UTC instant, or undefined if unusable. */
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms).toISOString();
}

/** Only the params that are actually set — omitted keys mean "no filter". */
export function buildTrashFilterParams(state: TrashFilterState): Record<string, string> {
  const params: Record<string, string> = {};

  if (state.annotationType !== ALL) params.annotation_type = state.annotationType;
  if (state.deletedBy !== ALL) params.deleted_by__username = state.deletedBy;

  const from = localInputToIso(state.deletedFrom);
  if (from) params.deleted_at__gte = from;

  const to = localInputToIso(state.deletedTo);
  if (to) params.deleted_at__lte = to;

  return params;
}

export function hasActiveTrashFilters(state: TrashFilterState): boolean {
  return Object.keys(buildTrashFilterParams(state)).length > 0;
}
