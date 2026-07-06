import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { WorksetViewerClient } from '@/components/lightbox/workset-viewer-client';
import { env } from '@/lib/env';
import { getWorkset } from '@/services/worksets';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

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
  const [workset, locale, modelLabels, t] = await Promise.all([
    getWorkset(publicId).catch(() => null),
    getLocale(),
    readModelLabels(),
    getTranslations('workset.metadata'),
  ]);
  // The root layout applies a `%s | ${siteTitle}` title template, so
  // return the bare title here to avoid double-suffixing.
  if (!workset) return { title: t('fallbackTitle') };
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  const description = workset.description || t('defaultDescription');
  return {
    title: workset.title,
    description,
    alternates: { canonical: `${env.siteUrl}/worksets/${publicId}` },
    openGraph: { title: `${workset.title} | ${siteTitle}`, description },
  };
}

export default async function WorksetRoute({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const workset = await getWorkset(publicId);
  // null = unknown id OR a Private workset viewed by a non-owner — both 404.
  if (!workset) notFound();
  if (workset.payload.collection) {
    redirect(`/collection?share=${encodeURIComponent(publicId)}`);
  }
  return <WorksetViewerClient workset={workset} />;
}
