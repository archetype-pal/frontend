import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { HandViewer } from './hand-viewer';
import type { HandDetail, HandImage, HandScribe, HandManuscript } from '@/types/hand-detail';
import { apiFetch } from '@/lib/api-fetch';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

async function getHand(id: string): Promise<HandDetail> {
  const response = await apiFetch(`/api/v1/hands/${id}/`);
  if (!response.ok) {
    if (response.status === 404) notFound();
    throw new Error('Failed to fetch hand');
  }
  return response.json();
}

async function getHandImages(itemPartId: number): Promise<HandImage[]> {
  const response = await apiFetch(`/api/v1/manuscripts/item-images/?item_part=${itemPartId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results ?? data ?? [];
}

async function getScribe(scribeId: number): Promise<HandScribe | null> {
  try {
    const response = await apiFetch(`/api/v1/scribes/${scribeId}/`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function getManuscript(itemPartId: number): Promise<HandManuscript | null> {
  try {
    const response = await apiFetch(`/api/v1/manuscripts/item-parts/${itemPartId}/`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [locale, modelLabels, t] = await Promise.all([
    getLocale(),
    readModelLabels(),
    getTranslations('hand.metadata'),
  ]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  try {
    const hand = await getHand(id);
    const name = hand.name || id;
    return {
      // The root layout applies a `%s | ${siteTitle}` title template, so
      // return the bare title here to avoid double-suffixing.
      title: hand.name || t('fallbackTitle', { id }),
      description: hand.place
        ? t('descriptionWithPlace', { name, place: hand.place, siteTitle })
        : t('description', { name, siteTitle }),
    };
  } catch {
    return { title: t('catchFallbackTitle') };
  }
}

export default async function HandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hand = await getHand(id);

  // Fetch related data in parallel
  const [images, scribe, manuscript] = await Promise.all([
    hand.item_part ? getHandImages(hand.item_part) : Promise.resolve([]),
    hand.scribe ? getScribe(hand.scribe) : Promise.resolve(null),
    hand.item_part ? getManuscript(hand.item_part) : Promise.resolve(null),
  ]);

  return <HandViewer hand={hand} images={images} scribe={scribe} manuscript={manuscript} />;
}
