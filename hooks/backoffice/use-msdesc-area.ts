'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { msdescFromFragment, msdescToFragment, type MsDescAreaStates } from '@/lib/msdesc-form';
import type { MsDescAreaId } from '@/lib/msdesc-vocab';
import {
  validateTei,
  type TeiValidationError,
  type TeiValidationResult,
} from '@/services/image-texts';

/**
 * Per-area editing state machine for a stored `MsDescArea` fragment
 * (TEI descriptions roadmap 2.2-UI / 2.3 / 6.1). Owns the data-safety
 * contract's client half:
 *
 * - The stored fragment is either REPRESENTABLE (`formState` non-null — the
 *   typed form is the editing surface; form edits re-serialize canonically
 *   via `msdescToFragment`) or UNREPRESENTABLE (`formState` null with a
 *   diagnostic `formUnavailableReason` — the Source tab is the only editing
 *   surface and the stored string is never round-tripped through the form).
 * - Save gating (6.1): ONE debounced `validate-tei` call per area on the
 *   COMPOSED fragment; `canSave` stays false until the *current* content
 *   bytes are confirmed well-formed (pessimistic while pending/unknown).
 *   A publish-toggle-only change needs no validation — the content bytes are
 *   already stored.
 *
 * The validate call is injectable so the gating logic is unit-testable
 * without a network (see `use-msdesc-area.test.tsx`).
 */

export type MsDescValidationStatus = 'idle' | 'pending' | 'valid' | 'invalid' | 'unknown';

export interface MsDescValidation {
  status: MsDescValidationStatus;
  errors: TeiValidationError[];
}

export interface UseMsDescAreaOptions<A extends MsDescAreaId> {
  area: A;
  /** Stored fragment from the server (resynced after refetch when pristine). */
  savedContent: string;
  savedPublished: boolean;
  token: string | null;
  /** Injectable for tests; defaults to the shared `validate-tei` endpoint. */
  validate?: (content: string, token: string) => Promise<TeiValidationResult>;
  debounceMs?: number;
}

export interface UseMsDescAreaResult<A extends MsDescAreaId> {
  /** The composed area fragment — the exact bytes a Save would persist. */
  content: string;
  /** Typed form state when the fragment is representable, else null. */
  formState: MsDescAreaStates[A] | null;
  /** Diagnostic parse-rejection reason when the form is unavailable. */
  formUnavailableReason: string | null;
  isPublished: boolean;
  /** Unsaved content edits (form or source). */
  contentDirty: boolean;
  /** Any unsaved change (content or publish flag). */
  dirty: boolean;
  validation: MsDescValidation;
  /** Save allowed: dirty, and any content edit confirmed well-formed. */
  canSave: boolean;
  /** Structural form edit — re-serializes canonically. */
  applyFormState: (next: MsDescAreaStates[A]) => void;
  /** Source-tab edit — reparses to re-enable/disable the form. */
  applySource: (text: string) => void;
  setPublished: (published: boolean) => void;
  /** Reset dirty tracking after a successful PATCH. */
  markSaved: () => void;
}

interface Draft<A extends MsDescAreaId> {
  content: string;
  formState: MsDescAreaStates[A] | null;
  reason: string | null;
}

interface CheckedResult {
  content: string;
  valid: boolean;
  errors: TeiValidationError[];
}

function makeDraft<A extends MsDescAreaId>(area: A, content: string): Draft<A> {
  const parsed = msdescFromFragment(area, content);
  return parsed.ok
    ? { content, formState: parsed.state, reason: null }
    : { content, formState: null, reason: parsed.reason };
}

export function useMsDescArea<A extends MsDescAreaId>({
  area,
  savedContent,
  savedPublished,
  token,
  validate = validateTei,
  debounceMs = 400,
}: UseMsDescAreaOptions<A>): UseMsDescAreaResult<A> {
  const [draft, setDraft] = useState<Draft<A>>(() => makeDraft(area, savedContent));
  const [contentDirty, setContentDirty] = useState(false);
  const [isPublished, setIsPublished] = useState(savedPublished);
  // Local publish baseline: `savedPublished` only updates on refetch, so
  // comparing against the prop would flash dirty between save and refetch.
  const [basePublished, setBasePublished] = useState(savedPublished);
  // Last completed well-formedness check, keyed by the exact content bytes it
  // ran against — validity is derived, so no synchronous setState in effects.
  const [checked, setChecked] = useState<CheckedResult | null>(null);
  const [checkFailedFor, setCheckFailedFor] = useState<string | null>(null);

  const dirty = contentDirty || isPublished !== basePublished;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Resync from the server payload after a refetch — but never clobber
  // unsaved local edits (the user's draft wins until they save or discard).
  useEffect(() => {
    if (dirtyRef.current) return;
    // Intentional resync from refetched server state; runs only while pristine.
    setDraft(makeDraft(area, savedContent));
    setIsPublished(savedPublished);
    setBasePublished(savedPublished);
    setChecked(null);
    setCheckFailedFor(null);
  }, [area, savedContent, savedPublished]);

  // 6.1 — ONE debounced validate-tei call per area on the composed fragment
  // (never per leaf). Only content edits need it; stored content was already
  // persisted as-is and a publish-only toggle re-sends the same bytes.
  useEffect(() => {
    if (!contentDirty || !token) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const result = await validate(draft.content, token);
        if (cancelled) return;
        setChecked({ content: draft.content, valid: result.valid, errors: result.errors });
      } catch {
        // Endpoint unreachable: validity unknown → Save stays disabled rather
        // than trusting a stale prior result.
        if (!cancelled) setCheckFailedFor(draft.content);
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [draft.content, contentDirty, token, validate, debounceMs]);

  const validation = useMemo<MsDescValidation>(() => {
    if (!contentDirty) return { status: 'idle', errors: [] };
    if (checked && checked.content === draft.content) {
      return { status: checked.valid ? 'valid' : 'invalid', errors: checked.errors };
    }
    if (checkFailedFor === draft.content || !token) return { status: 'unknown', errors: [] };
    return { status: 'pending', errors: [] };
  }, [contentDirty, checked, checkFailedFor, draft.content, token]);

  const canSave = dirty && (!contentDirty || validation.status === 'valid');

  const applyFormState = useCallback(
    (next: MsDescAreaStates[A]) => {
      setDraft({ content: msdescToFragment(area, next), formState: next, reason: null });
      setContentDirty(true);
    },
    [area]
  );

  const applySource = useCallback(
    (text: string) => {
      setDraft(makeDraft(area, text));
      setContentDirty(true);
    },
    [area]
  );

  const markSaved = useCallback(() => {
    setContentDirty(false);
    setBasePublished(isPublished);
  }, [isPublished]);

  const setPublished = useCallback((published: boolean) => {
    setIsPublished(published);
  }, []);

  return {
    content: draft.content,
    formState: draft.formState,
    formUnavailableReason: draft.reason,
    isPublished,
    contentDirty,
    dirty,
    validation,
    canSave,
    applyFormState,
    applySource,
    setPublished,
    markSaved,
  };
}
