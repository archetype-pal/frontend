'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const AUTOSAVE_PREFIX = 'archetype_autosave_';

interface AutosaveData<T> {
  data: T;
  savedAt: number;
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
    const timer = setInterval(() => {
      setStatus('saving');
      // Small delay so the "Saving..." text is visible
      setTimeout(() => save(), 300);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [dirty, intervalMs, save]);

  // Recover saved draft
  const recover = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: AutosaveData<T> = JSON.parse(raw);
      return parsed.data;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Check if a draft exists and how old it is
  const getDraftInfo = useCallback((): { exists: boolean; savedAt: number | null } => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { exists: false, savedAt: null };
      const parsed: AutosaveData<T> = JSON.parse(raw);
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
