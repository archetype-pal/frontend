'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const AUTOSAVE_PREFIX = 'archetype_autosave_';

interface AutosaveData<T> {
  data: T;
  savedAt: number;
}

// Validate a parsed value matches the AutosaveData<T> shape: a plain
// object carrying both `data` and a numeric `savedAt`. `'null'`, arrays,
// and old-format objects without these keys would otherwise leak undefined
// into callers — the editor's recovery prompt would offer to restore a
// draft that doesn't actually exist. Module-scope so its identity is
// stable across renders (the hook's useCallbacks don't need it in deps).
function isAutosavePayload(value: unknown): value is { data: unknown; savedAt: number } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'data' in value &&
    typeof (value as { savedAt?: unknown }).savedAt === 'number'
  );
}

/**
 * Autosave hook that periodically saves form data to localStorage.
 *
 * Features:
 * - Saves dirty form data every `intervalMs` milliseconds
 * - Recovers data when the component mounts if a draft exists
 * - Shows "Saving..." / "Saved" / "Unsaved changes" status
 * - Clears the draft when the user explicitly saves or discards
 *
 * @param key      Unique key for this form (e.g. `publication:my-slug`)
 * @param data     Current form data to save
 * @param dirty    Whether the form has unsaved changes
 * @param intervalMs  Autosave interval (default: 30 seconds)
 */
export function useAutosave<T>(key: string, data: T, dirty: boolean, intervalMs = 30_000) {
  const storageKey = `${AUTOSAVE_PREFIX}${key}`;
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Save to localStorage
  const save = useCallback(() => {
    try {
      const payload: AutosaveData<T> = {
        data: dataRef.current,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(payload.savedAt);
      setStatus('saved');
    } catch {
      // localStorage might be full or unavailable
    }
  }, [storageKey]);

  // Periodic autosave when dirty
  useEffect(() => {
    if (!dirty) {
      setStatus('idle'); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    setStatus('idle');
    // Track the inner "Saving..." → save() timer so cleanup cancels it.
    // Without this, a manual server save (which flips dirty back to false
    // and triggers cleanup) could race with an in-flight 300ms timer and
    // write a stale localStorage draft after the cleanup ran — the next
    // page load would then offer recovery for an already-saved record.
    let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      setStatus('saving');
      pendingSaveTimer = setTimeout(() => {
        pendingSaveTimer = null;
        save();
      }, 300);
    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (pendingSaveTimer !== null) clearTimeout(pendingSaveTimer);
    };
  }, [dirty, intervalMs, save]);

  // Recover saved draft
  const recover = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isAutosavePayload(parsed) ? (parsed.data as T) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Check if a draft exists and how old it is
  const getDraftInfo = useCallback((): { exists: boolean; savedAt: number | null } => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { exists: false, savedAt: null };
      const parsed: unknown = JSON.parse(raw);
      if (!isAutosavePayload(parsed)) return { exists: false, savedAt: null };
      return { exists: true, savedAt: parsed.savedAt };
    } catch {
      return { exists: false, savedAt: null };
    }
  }, [storageKey]);

  // Clear the autosaved draft (call after successful server save)
  const discard = useCallback(() => {
    localStorage.removeItem(storageKey);
    setLastSavedAt(null);
    setStatus('idle');
  }, [storageKey]);

  return {
    save,
    recover,
    discard,
    getDraftInfo,
    lastSavedAt,
    status,
  };
}
