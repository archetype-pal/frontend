import { requireSection } from '@/lib/route-gates';

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
  await requireSection('search');
  return children;
}
