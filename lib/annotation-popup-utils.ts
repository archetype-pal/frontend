import type { DraftSharePayload } from '@/types/annotation-viewer';

export const metaKeyFor = (iiif: string) => `annotations:meta:${iiif}`;

export const cacheKeyFor = (iiif: string) => `annotations:${iiif}`;

export const isDbId = (id?: string) => typeof id === 'string' && id.startsWith('db:');

export function toggleNumericId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

export function includesAllIds(available: number[], selected: number[]): boolean {
  if (!available.length) return true;
  const selectedSet = new Set(selected);
  return available.every((id) => selectedSet.has(id));
}

export function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDraftSharePayload(payload: DraftSharePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeDraftSharePayload(value: string): DraftSharePayload | null {
  try {
    return JSON.parse(fromBase64Url(value)) as DraftSharePayload;
  } catch {
    return null;
  }
}

/** Rewrite cross-origin IIIF URL to same-origin /iiif-proxy to avoid CORS. Keeps path encoding (%2F) so Sipi receives a single identifier segment. */
export function browserSafeIiifUrl(raw: string): string {
  const base = raw.replace(/\/info\.json$/, '');
  if (typeof window === 'undefined') return base;

  try {
    const u = new URL(raw);
    if (u.origin !== window.location.origin) {
      const path = u.pathname.replace(/\/info\.json$/i, '');
      return `${window.location.origin}/iiif-proxy${path}`;
    }
    return base;
  } catch {
    return base;
  }
}
