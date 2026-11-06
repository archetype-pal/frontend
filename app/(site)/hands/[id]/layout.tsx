import { requireFound } from '@/lib/route-gates';
import { loadHand } from './hand';

export default async function HandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireFound(loadHand(id));
  return children;
}
