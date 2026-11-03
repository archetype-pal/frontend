import { requireFound } from '@/lib/route-gates';
import { loadManuscript } from './manuscript';

export default async function ManuscriptLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireFound(loadManuscript(id));
  return children;
}
