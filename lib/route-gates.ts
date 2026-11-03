import { notFound } from 'next/navigation';
import type { SectionKey } from './site-features';
import { readSiteFeatures } from './site-features-server';

// Both gates are for layouts. A layout renders above its route's loading.tsx,
// so a 404 decided here is sent before anything streams and keeps its status.
// Decided in the page, under the loading boundary, it arrives after a 200.

/** 404s a section an admin has switched off. */
export async function requireSection(section: SectionKey): Promise<void> {
  const { sections } = await readSiteFeatures();
  if (sections[section] === false) notFound();
}

/**
 * 404s when `lookup` resolves to null, the route's "no such record".
 *
 * A lookup that fails is left to the page: it calls the same cached loader,
 * which rethrows there, inside the route's own error boundary.
 */
export async function requireFound(lookup: Promise<unknown>): Promise<void> {
  const found = await lookup.catch(() => undefined);
  if (found === null) notFound();
}
