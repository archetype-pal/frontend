import type { Metadata } from 'next';
import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import { ManuscriptViewer } from './manuscript-viewer';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';
import Link from 'next/link';

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
  try {
    const manuscript = await getManuscript(id);
    if (!manuscript) {
      return { title: 'Manuscript' };
    }
    const label = manuscript.display_label ?? `Manuscript #${id}`;
    return {
      // The root layout applies a `%s | ${siteTitle}` title template, so
      // return the bare title here to avoid double-suffixing.
      title: label,
      description: `View manuscript ${label} – Scottish Charters and the Emergence of Government 1100-1250`,
    };
  } catch {
    return { title: 'Manuscript' };
  }
}

export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [manuscript, images] = await Promise.all([getManuscript(id), getManuscriptImages(id)]);

  if (!manuscript) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Unable to load manuscript
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The manuscript service is currently unavailable. Please try again shortly.
        </p>
        <div className="ornament-divider mt-6 w-44 text-border" aria-hidden />
        <Link
          href="/search/manuscripts"
          className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to manuscripts
        </Link>
      </main>
    );
  }

  return <ManuscriptViewer manuscript={manuscript} images={images} />;
}
