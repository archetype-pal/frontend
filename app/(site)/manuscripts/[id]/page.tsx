import type { Metadata } from 'next';
import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import { ManuscriptViewer } from './manuscript-viewer';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

async function getManuscript(id: string): Promise<Manuscript | null> {
  try {
    const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function getManuscriptImages(id: string): Promise<ManuscriptImage[]> {
  try {
    const res = await apiFetch(`/api/v1/manuscripts/item-images/?item_part=${id}`);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [t, locale, modelLabels] = await Promise.all([
    getTranslations('manuscript.metadata'),
    getLocale(),
    readModelLabels(),
  ]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  try {
    const manuscript = await getManuscript(id);
    if (!manuscript) {
      return { title: t('fallbackTitle') };
    }
    const label = manuscript.display_label ?? t('numberedFallbackTitle', { id });
    return {
      // The root layout applies a `%s | ${siteTitle}` title template, so
      // return the bare title here to avoid double-suffixing.
      title: label,
      description: t('description', { label, siteTitle }),
    };
  } catch {
    return { title: t('fallbackTitle') };
  }
}

export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [manuscript, images] = await Promise.all([getManuscript(id), getManuscriptImages(id)]);

  if (!manuscript) {
    const t = await getTranslations('manuscript.loadError');
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t('description')}</p>
        <div className="ornament-divider mt-6 w-44 text-border" aria-hidden />
        <Link
          href="/search/manuscripts"
          className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('backLink')}
        </Link>
      </main>
    );
  }

  return <ManuscriptViewer manuscript={manuscript} images={images} />;
}
