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
      return { title: 'Manuscript | Models of Authority' };
    }
    const label = manuscript.display_label ?? `Manuscript #${id}`;
    return {
      title: `${label} | Models of Authority`,
      description: `View manuscript ${label} – Scottish Charters and the Emergence of Government 1100-1250`,
    };
  } catch {
    return { title: 'Manuscript | Models of Authority' };
  }
}

export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manuscript = await getManuscript(id);

  if (!manuscript) {
    return (
      <main className="container mx-auto p-4 max-w-6xl">
        <div className="rounded-lg border bg-background p-6 text-center">
          <h1 className="text-2xl font-semibold mb-2">Unable to load manuscript</h1>
          <p className="text-muted-foreground mb-4">
            The manuscript service is currently unavailable. Please try again shortly.
          </p>
          <Link href="/search/manuscripts" className="text-blue-600 hover:underline">
            Back to manuscripts
          </Link>
        </div>
      </main>
    );
  }

  const images = await getManuscriptImages(id);
  return <ManuscriptViewer manuscript={manuscript} images={images} />;
}
