'use client';

import * as React from 'react';

import { deleteViewerAnnotation } from '@/services/annotations';

/** How long a deleted graph waits, hidden, before the delete is sent. */
export const UNDO_WINDOW_MS = 6000;

interface UndoableGraphDeleteOptions {
  token: string | null | undefined;
  /** Hide the graph at once, before the delete is sent. */
  onHide: (graphId: number) => void;
  /** Show the graph again: after Undo, or when the delete failed. */
  onRestore: (graphId: number) => void;
  /** The delete reached the server. */
  onDeleted: (graphId: number) => void;
  onFailed: (graphId: number) => void;
}

/**
 * Deletes a graph after an undo window instead of asking first. The graph is
 * hidden at once; the delete is sent when the window ends, or straight away
 * when the page is left or the gallery unmounts (with `keepalive`, so a
 * closing tab still sends it). `undo` cancels a delete that has not been sent
 * and returns false once it has.
 */
export function useUndoableGraphDelete(options: UndoableGraphDeleteOptions) {
  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  });
  const pendingRef = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const send = React.useCallback((graphId: number, leaving: boolean) => {
    const { token, onRestore, onDeleted, onFailed } = optionsRef.current;
    pendingRef.current.delete(graphId);
    if (!token) return;
    const request = deleteViewerAnnotation(token, graphId, { keepalive: true });
    // Nothing is left to update once the page has gone.
    if (leaving) {
      request.catch(() => {});
      return;
    }
    request.then(
      () => onDeleted(graphId),
      () => {
        onRestore(graphId);
        onFailed(graphId);
      }
    );
  }, []);

  const flush = React.useCallback(
    (leaving: boolean) => {
      for (const [graphId, timer] of [...pendingRef.current]) {
        clearTimeout(timer);
        send(graphId, leaving);
      }
    },
    [send]
  );

  React.useEffect(() => {
    const onPageHide = () => flush(true);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      flush(true);
    };
  }, [flush]);

  const remove = React.useCallback(
    (graphId: number) => {
      if (pendingRef.current.has(graphId)) return;
      optionsRef.current.onHide(graphId);
      pendingRef.current.set(
        graphId,
        setTimeout(() => send(graphId, false), UNDO_WINDOW_MS)
      );
    },
    [send]
  );

  const undo = React.useCallback((graphId: number) => {
    const timer = pendingRef.current.get(graphId);
    if (timer === undefined) return false;
    clearTimeout(timer);
    pendingRef.current.delete(graphId);
    optionsRef.current.onRestore(graphId);
    return true;
  }, []);

  return React.useMemo(() => ({ remove, undo }), [remove, undo]);
}
