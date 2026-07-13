import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ScribeViewer } from './scribe-viewer';
import type { ScribeDetail, ScribeHand } from '@/types/scribe-detail';
import { apiFetch } from '@/lib/api-fetch';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

async function getScribe(id: string): Promise<ScribeDetail> {
  const response = await apiFetch(`/api/v1/scribes/${id}/`);
  if (!response.ok) {
    if (response.status === 404) notFound();
    throw new Error('Failed to fetch scribe');
  }
  return response.json();
}

async function getScribeHands(scribeId: string): Promise<ScribeHand[]> {
  const response = await apiFetch(`/api/v1/hands/?scribe=${scribeId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results ?? data ?? [];
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
    getTranslations('scribe.metadata'),
  ]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  try {
    const scribe = await getScribe(id);
    const name = scribe.name || id;
    return {
      // The root layout applies a `%s | ${siteTitle}` title template, so
      // return the bare title here to avoid double-suffixing.
      title: scribe.name || t('fallbackTitle', { id }),
      description: scribe.scriptorium
        ? t('descriptionWithScriptorium', { name, scriptorium: scribe.scriptorium, siteTitle })
        : t('description', { name, siteTitle }),
    };
  } catch {
    return { title: t('catchFallbackTitle') };
  }
}

export default async function ScribePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [scribe, hands] = await Promise.all([getScribe(id), getScribeHands(id)]);

  return <ScribeViewer scribe={scribe} hands={hands} />;
}
