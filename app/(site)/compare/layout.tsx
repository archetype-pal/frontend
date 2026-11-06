import { requireSection } from '@/lib/route-gates';

export default async function CompareLayout({ children }: { children: React.ReactNode }) {
  await requireSection('compare');
  return children;
}
