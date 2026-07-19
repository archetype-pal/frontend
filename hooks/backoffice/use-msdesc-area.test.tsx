import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMsDescArea } from './use-msdesc-area';
import { msdescTemplateFragment } from '@/lib/msdesc-template';
import type { MsIdentifierState } from '@/lib/msdesc-form';
import type { TeiValidationResult } from '@/services/image-texts';

const VALID: TeiValidationResult = { valid: true, errors: [] };
const INVALID: TeiValidationResult = {
  valid: false,
  errors: [{ line: 1, col: 5, message: 'mismatched tag' }],
};

const IDENTIFIER = msdescTemplateFragment('msIdentifier');
// Unknown element (<sealDesc>) → unrepresentable by the typed form model.
const UNREPRESENTABLE = '<msIdentifier>\n  <sealDesc>wax</sealDesc>\n</msIdentifier>';

function setup(overrides: Partial<Parameters<typeof useMsDescArea>[0]> = {}) {
  const validate = vi.fn().mockResolvedValue(VALID);
  const options = {
    area: 'msIdentifier' as const,
    savedContent: IDENTIFIER,
    savedPublished: false,
    token: 'tok',
    validate,
    debounceMs: 400,
    ...overrides,
  };
  const rendered = renderHook((props: typeof options) => useMsDescArea(props), {
    initialProps: options,
  });
  return { ...rendered, validate, options };
}

async function flushDebounce(ms = 400) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useMsDescArea — representability gate', () => {
  it('parses a representable fragment to typed form state', () => {
    const { result } = setup();
    expect(result.current.formState).not.toBeNull();
    expect(result.current.formUnavailableReason).toBeNull();
    expect((result.current.formState as MsIdentifierState).shelfmark).toBe('');
  });

  it('disables the form (with a diagnostic reason) for an unrepresentable fragment', () => {
    const { result } = setup({ savedContent: UNREPRESENTABLE });
    expect(result.current.formState).toBeNull();
    expect(result.current.formUnavailableReason).toMatch(/sealDesc/);
    // The stored string stays untouched — Source is the editing surface.
    expect(result.current.content).toBe(UNREPRESENTABLE);
  });

  it('a source edit can flip representability in both directions', () => {
    const { result } = setup();
    act(() => result.current.applySource(UNREPRESENTABLE));
    expect(result.current.formState).toBeNull();
    expect(result.current.formUnavailableReason).toMatch(/sealDesc/);

    act(() => result.current.applySource(IDENTIFIER));
    expect(result.current.formState).not.toBeNull();
    expect(result.current.formUnavailableReason).toBeNull();
  });

  it('form edits re-serialize canonically into content', () => {
    const { result } = setup();
    const state = result.current.formState as MsIdentifierState;
    act(() => result.current.applyFormState({ ...state, shelfmark: 'MS 137' }));
    expect(result.current.content).toContain('<idno type="shelfmark">MS 137</idno>');
    expect(result.current.contentDirty).toBe(true);
  });
});

describe('useMsDescArea — validation gating (6.1)', () => {
  it('starts pristine: no validation call, save disabled', async () => {
    const { result, validate } = setup();
    expect(result.current.dirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.validation.status).toBe('idle');
    await flushDebounce(2000);
    expect(validate).not.toHaveBeenCalled();
  });

  it('a content edit gates save on ONE debounced validate call for the composed fragment', async () => {
    const { result, validate } = setup();
    const state = result.current.formState as MsIdentifierState;
    act(() => result.current.applyFormState({ ...state, country: 'Scotland' }));

    // Pessimistic while pending — a save inside the debounce window is blocked.
    expect(result.current.validation.status).toBe('pending');
    expect(result.current.canSave).toBe(false);

    await flushDebounce();
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith(result.current.content, 'tok');
    expect(result.current.validation.status).toBe('valid');
    expect(result.current.canSave).toBe(true);
  });

  it('rapid edits debounce into a single validate call', async () => {
    const { result, validate } = setup();
    act(() => result.current.applySource('<msIdentifier>a</msIdentifier>'));
    await flushDebounce(200);
    act(() => result.current.applySource('<msIdentifier>ab</msIdentifier>'));
    await flushDebounce(200);
    act(() => result.current.applySource('<msIdentifier>abc</msIdentifier>'));
    await flushDebounce(400);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledWith('<msIdentifier>abc</msIdentifier>', 'tok');
  });

  it('invalid TEI keeps save disabled and exposes line/col errors', async () => {
    const { result, validate } = setup();
    validate.mockResolvedValue(INVALID);
    act(() => result.current.applySource('<msIdentifier><broken></msIdentifier>'));
    await flushDebounce();
    expect(result.current.validation.status).toBe('invalid');
    expect(result.current.validation.errors).toEqual(INVALID.errors);
    expect(result.current.canSave).toBe(false);
  });

  it('a failed validation request leaves validity unknown — save stays disabled', async () => {
    const { result, validate } = setup();
    validate.mockRejectedValue(new Error('network down'));
    act(() => result.current.applySource('<msIdentifier/>'));
    await flushDebounce();
    expect(result.current.validation.status).toBe('unknown');
    expect(result.current.canSave).toBe(false);
  });

  it('an edit after a valid check re-enters pending (no stale true)', async () => {
    const { result } = setup();
    act(() => result.current.applySource('<msIdentifier/>'));
    await flushDebounce();
    expect(result.current.canSave).toBe(true);

    act(() => result.current.applySource('<msIdentifier>x</msIdentifier>'));
    expect(result.current.validation.status).toBe('pending');
    expect(result.current.canSave).toBe(false);
  });

  it('a publish-only toggle saves without validation (bytes already stored)', async () => {
    const { result, validate } = setup();
    act(() => result.current.setPublished(true));
    expect(result.current.dirty).toBe(true);
    expect(result.current.contentDirty).toBe(false);
    expect(result.current.canSave).toBe(true);
    await flushDebounce(2000);
    expect(validate).not.toHaveBeenCalled();
  });

  it('without a token validity is unknown and save stays disabled', async () => {
    const { result, validate } = setup({ token: null });
    act(() => result.current.applySource('<msIdentifier/>'));
    expect(result.current.validation.status).toBe('unknown');
    expect(result.current.canSave).toBe(false);
    await flushDebounce(2000);
    expect(validate).not.toHaveBeenCalled();
  });
});

describe('useMsDescArea — dirty tracking and resync', () => {
  it('markSaved resets dirty (content + publish baseline)', async () => {
    const { result } = setup();
    act(() => {
      result.current.applySource('<msIdentifier/>');
      result.current.setPublished(true);
    });
    await flushDebounce();
    expect(result.current.canSave).toBe(true);

    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
    expect(result.current.contentDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.isPublished).toBe(true);
  });

  it('resyncs from refetched server state while pristine', () => {
    const { result, rerender, options } = setup();
    const next = '<msIdentifier>\n  <country>Scotland</country>\n</msIdentifier>';
    rerender({ ...options, savedContent: next, savedPublished: true });
    expect(result.current.content).toBe(next);
    expect(result.current.isPublished).toBe(true);
    expect(result.current.dirty).toBe(false);
    expect((result.current.formState as MsIdentifierState).country).toBe('Scotland');
  });

  it('never clobbers unsaved local edits on refetch', () => {
    const { result, rerender, options } = setup();
    act(() => result.current.applySource('<msIdentifier>mine</msIdentifier>'));
    rerender({
      ...options,
      savedContent: '<msIdentifier>server</msIdentifier>',
      savedPublished: true,
    });
    expect(result.current.content).toBe('<msIdentifier>mine</msIdentifier>');
    expect(result.current.isPublished).toBe(false);
    expect(result.current.dirty).toBe(true);
  });
});
