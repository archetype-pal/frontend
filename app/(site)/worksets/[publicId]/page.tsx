import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { WorksetViewerClient } from '@/components/lightbox/workset-viewer-client';
import { env } from '@/lib/env';
import { getWorkset } from '@/services/worksets';

// `dynamic = 'force-dynamic'` is set in the route's layout.tsx (this route
// is fetched per-request and hydrates the client-only lightbox store).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  // Metadata must never throw — degrade to a default title if the lookup fails
  // (the page render below surfaces a real error via the error boundary).
  const workset = await getWorkset(publicId).catch(() => null);
  // The root layout applies a `%s | Models of Authority` title template, so
  // return the bare title here to avoid double-suffixing.
  if (!workset) return { title: 'Workset' };
  const description = workset.description || 'A shared lightbox workset of manuscript images.';
  return {
    title: workset.title,
    description,
    alternates: { canonical: `${env.siteUrl}/worksets/${publicId}` },
    openGraph: { title: `${workset.title} | Models of Authority`, description },
  };
}

export default async function WorksetRoute({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const workset = await getWorkset(publicId);
  // null = unknown id OR a Private workset viewed by a non-owner — both 404.
  if (!workset) notFound();
  return <WorksetViewerClient workset={workset} />;
}
