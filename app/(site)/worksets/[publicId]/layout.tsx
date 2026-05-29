// Force dynamic rendering: a workset is fetched per-request and hydrates the
// client-only (IndexedDB-backed) lightbox store, so it must never be prerendered.
export const dynamic = 'force-dynamic';

export default function WorksetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
