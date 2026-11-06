import { requireFound } from '@/lib/route-gates';
import { getVisiblePage } from './visible-page';

export default async function AboutPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireFound(getVisiblePage(slug));
  return children;
}
