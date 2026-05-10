import { describe, expect, test } from 'vitest';

import { diffJson, formatDiffValue } from './edit-event-diff';

describe('diffJson', () => {
  test('identical primitives → only unchanged ops', () => {
    const result = diffJson({ a: 1 }, { a: 1 });
    expect(result.isEmpty).toBe(true);
  });

  test('changed primitive → changed op with from/to', () => {
    const result = diffJson({ a: 1 }, { a: 2 });
    expect(result.ops).toContainEqual({ kind: 'changed', path: 'a', from: 1, to: 2 });
  });

  test('added key → added op', () => {
    const result = diffJson({}, { a: 1 });
    expect(result.ops).toContainEqual({ kind: 'added', path: 'a', to: 1 });
  });

  test('removed key → removed op', () => {
    const result = diffJson({ a: 1 }, {});
    expect(result.ops).toContainEqual({ kind: 'removed', path: 'a', from: 1 });
  });

  test('nested object change reports nested path', () => {
    const result = diffJson({ a: { b: 1 } }, { a: { b: 2 } });
    expect(result.ops).toContainEqual({ kind: 'changed', path: 'a.b', from: 1, to: 2 });
  });

  test('array index change reports bracketed path', () => {
    const result = diffJson({ xs: [1, 2, 3] }, { xs: [1, 9, 3] });
    expect(result.ops).toContainEqual({ kind: 'changed', path: 'xs[1]', from: 2, to: 9 });
  });

  test('array length grows → added ops on the new indices', () => {
    const result = diffJson({ xs: [1] }, { xs: [1, 2] });
    expect(result.ops).toContainEqual({ kind: 'added', path: 'xs[1]', to: 2 });
  });

  test('type change reports as a single changed op (no recursion)', () => {
    const result = diffJson({ x: { y: 1 } }, { x: 'now-a-string' });
    const xOps = result.ops.filter((op) => op.path === 'x');
    expect(xOps).toHaveLength(1);
    expect(xOps[0].kind).toBe('changed');
  });
});

describe('formatDiffValue', () => {
  test('truncates long strings with an ellipsis', () => {
    // max=10 → 9 chars of content + ellipsis inside the surrounding quotes.
    expect(formatDiffValue('x'.repeat(100), 10)).toBe('"xxxxxxxxx…"');
  });
  test('serialises objects', () => {
    expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
  });
  test('null and undefined are visually distinct', () => {
    expect(formatDiffValue(undefined)).toBe('∅');
    expect(formatDiffValue(null)).toBe('null');
  });
});
