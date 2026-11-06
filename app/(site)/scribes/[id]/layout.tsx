import { requireFound } from '@/lib/route-gates';
import { loadScribe } from './scribe';

export default async function ScribeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireFound(loadScribe(id));
  return children;
}
