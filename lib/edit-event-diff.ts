/**
 * Phase D.3 — pretty-print the JSON `payload` of an `EditEvent` so the
 * side rail's history tab shows *what changed*, not just *that
 * something changed*. Pure helpers; no React in this file.
 *
 * The implementation is deliberately tiny — we don't ship a full
 * structural diff library because:
 *   1. The audit-log payloads are small (a single annotation's worth).
 *   2. The output only has to be human-readable, not machine-mergeable.
 *   3. Editors care about *which* fields moved, not character-level diff.
 */

export type DiffOp =
  | { kind: 'added'; path: string; to: unknown }
  | { kind: 'removed'; path: string; from: unknown }
  | { kind: 'changed'; path: string; from: unknown; to: unknown }
  | { kind: 'unchanged'; path: string; value: unknown };

export interface DiffResult {
  ops: DiffOp[];
  /** True iff every op is `unchanged`. */
  isEmpty: boolean;
}

/**
 * Diff two arbitrary JSON values, producing a flat list of operations
 * keyed by dotted path. Arrays are diffed by index. Objects are diffed
 * by key. Primitives are diffed by `===`.
 */
export function diffJson(before: unknown, after: unknown, basePath = ''): DiffResult {
  const ops: DiffOp[] = [];
  walk(before, after, basePath, ops);
  return { ops, isEmpty: ops.every((op) => op.kind === 'unchanged') };
}

function walk(before: unknown, after: unknown, path: string, ops: DiffOp[]) {
  if (before === undefined && after !== undefined) {
    ops.push({ kind: 'added', path, to: after });
    return;
  }
  if (before !== undefined && after === undefined) {
    ops.push({ kind: 'removed', path, from: before });
    return;
  }
  if (Object.is(before, after)) {
    ops.push({ kind: 'unchanged', path, value: before });
    return;
  }
  if (
    before == null ||
    after == null ||
    typeof before !== typeof after ||
    typeof before !== 'object'
  ) {
    ops.push({ kind: 'changed', path, from: before, to: after });
    return;
  }
  if (Array.isArray(before) !== Array.isArray(after)) {
    ops.push({ kind: 'changed', path, from: before, to: after });
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) {
      walk(before[i], after[i], appendPath(path, `[${i}]`), ops);
    }
    return;
  }
  const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
  for (const key of Array.from(keys).sort()) {
    walk(
      (before as Record<string, unknown>)[key],
      (after as Record<string, unknown>)[key],
      appendPath(path, key),
      ops
    );
  }
}

function appendPath(prefix: string, segment: string): string {
  if (!prefix) return segment;
  if (segment.startsWith('[')) return prefix + segment;
  return prefix + '.' + segment;
}

/** Stringify a value for display in the side rail. Trims long strings. */
export function formatDiffValue(value: unknown, max = 80): string {
  if (value === undefined) return '∅';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length <= max ? `"${value}"` : `"${value.slice(0, max - 1)}…"`;
  }
  try {
    const json = JSON.stringify(value);
    return json.length <= max ? json : json.slice(0, max - 1) + '…';
  } catch {
    return String(value);
  }
}
