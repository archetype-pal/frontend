import type { Metadata } from 'next';
import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import { ManuscriptViewer } from './manuscript-viewer';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import { fetchHands } from '@/services/manuscripts';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';
import { readSiteFeatures } from '@/lib/site-features-server';

async function getManuscript(id: string): Promise<Manuscript | null> {
  try {
    const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}/`);

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
  const [manuscript, images, siteFeatures, hands] = await Promise.all([
    getManuscript(id),
    getManuscriptImages(id),
    readSiteFeatures(),
    // Hands associated with this item-part; a fetch failure must not break the
    // page, so fall back to an empty list (the section then renders nothing).
    fetchHands(id)
      .then((r) => r.results)
      .catch(() => []),
  ]);
  // Read the flag here, on the server, rather than from the client context: the
  // msDesc markup then never reaches the browser when the feature is off — no
  // flash of a hidden section and no hydration mismatch. `!== false` matches the
  // convention used for sections in app/(site)/page.tsx: only an explicit
  // opt-out disables.
  const msDescEnabled = siteFeatures.features.manuscriptDescriptions !== false;

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

  // Skipping the render is not enough to call the feature "off": ManuscriptViewer
  // is a client component, so everything left on `manuscript` is serialized into
  // the RSC payload and readable in the browser even when nothing is drawn. Drop
  // the areas from the payload too, so disabling the feature actually withholds
  // the content rather than merely hiding it.
  const viewerManuscript = msDescEnabled ? manuscript : { ...manuscript, msdesc_areas: [] };

  return (
    <ManuscriptViewer
      manuscript={viewerManuscript}
      images={images}
      hands={hands}
      msDescEnabled={msDescEnabled}
    />
  );
}
