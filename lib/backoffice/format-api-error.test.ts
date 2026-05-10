import { describe, expect, it } from 'vitest';

import { BackofficeApiError } from '@/services/backoffice/api-client';
import { formatApiError } from './format-api-error';

describe('formatApiError', () => {
  it('returns the `detail` field directly when present', () => {
    const err = new BackofficeApiError(404, { detail: 'Not found.' });
    expect(formatApiError(err)).toBe('Not found.');
  });

  it('joins non_field_errors with ". " between entries', () => {
    const err = new BackofficeApiError(400, {
      non_field_errors: ['First problem.', 'Second problem.'],
    });
    expect(formatApiError(err)).toBe('First problem.. Second problem.');
  });

  it('formats DRF field-level array errors as `field: msg1, msg2`', () => {
    const err = new BackofficeApiError(400, {
      title: ['This field is required.'],
      slug: ['Already exists.', 'Must be lowercase.'],
    });
    expect(formatApiError(err)).toBe(
      'title: This field is required.. slug: Already exists., Must be lowercase.'
    );
  });

  it('handles a string field value (non-array shape) as `field: value`', () => {
    const err = new BackofficeApiError(400, { reason: 'Quota exceeded' });
    expect(formatApiError(err)).toBe('reason: Quota exceeded');
  });

  it('falls back to "Server error (status)" when the body has no readable shape', () => {
    const err = new BackofficeApiError(500, {});
    expect(formatApiError(err)).toBe('Server error (500)');
  });

  it('falls back to "Server error" when body has only non-renderable values', () => {
    // Numbers / objects / nested arrays aren't currently formatted.
    const err = new BackofficeApiError(500, { code: 42, nested: { foo: 'bar' } });
    expect(formatApiError(err)).toBe('Server error (500)');
  });

  it('uses Error.message for plain Errors', () => {
    expect(formatApiError(new Error('boom'))).toBe('boom');
    expect(formatApiError(new TypeError('bad type'))).toBe('bad type');
  });

  it('returns a generic message for unknown error shapes', () => {
    expect(formatApiError(null)).toBe('An unexpected error occurred');
    expect(formatApiError(undefined)).toBe('An unexpected error occurred');
    expect(formatApiError('string error')).toBe('An unexpected error occurred');
    expect(formatApiError(42)).toBe('An unexpected error occurred');
    expect(formatApiError({ message: 'plain object' })).toBe('An unexpected error occurred');
  });

  it('prefers `detail` over field-level errors when both are present', () => {
    const err = new BackofficeApiError(400, {
      detail: 'Top-level reason.',
      title: ['ignored'],
    });
    expect(formatApiError(err)).toBe('Top-level reason.');
  });

  it('prefers non_field_errors over field-level errors when both are present', () => {
    const err = new BackofficeApiError(400, {
      non_field_errors: ['Cross-field rule failed.'],
      title: ['ignored'],
    });
    expect(formatApiError(err)).toBe('Cross-field rule failed.');
  });
});
