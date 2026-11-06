import { requireSection } from '@/lib/route-gates';

// Force dynamic rendering so lightbox (client-only, IndexedDB) is never prerendered.
export const dynamic = 'force-dynamic';

export default async function LightboxLayout({ children }: { children: React.ReactNode }) {
  await requireSection('lightbox');
  return children;
}
