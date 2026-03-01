// Force dynamic rendering so lightbox (client-only, IndexedDB) is never prerendered.
export const dynamic = 'force-dynamic';

export default function LightboxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
