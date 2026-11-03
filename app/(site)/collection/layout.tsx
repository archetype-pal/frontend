import { requireSection } from '@/lib/route-gates';

export default async function CollectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection('collection');
  return children;
}
