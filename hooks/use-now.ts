import { useSyncExternalStore } from 'react';

/**
 * The time, in milliseconds, ticking once a second while any component
 * shows it. One interval serves every caller, and none runs while nothing
 * is subscribed. Before the first tick (and on the server) it reads 0.
 */

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // React reads the snapshot again once subscribed, so this shows at once.
  now = Date.now();
  if (timer === undefined) {
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const idle = () => () => {};
const read = () => now;
const readOnServer = () => 0;

/** `Date.now()`, a second at a time, while `active`. */
export function useNow(active = true): number {
  return useSyncExternalStore(active ? subscribe : idle, read, readOnServer);
}
