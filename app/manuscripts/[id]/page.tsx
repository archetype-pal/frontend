import type { Metadata } from 'next';
import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import { ManuscriptViewer } from './manuscript-viewer';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

async function getManuscript(id: string): Promise<Manuscript> {
  const response = await apiFetch(`/api/v1/manuscripts/item-parts/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }
    throw new Error('Failed to fetch manuscript');
  }

  return response.json();
}

async function getManuscriptImages(id: string): Promise<ManuscriptImage[]> {
  const res = await apiFetch(`/api/v1/manuscripts/item-images/?item_part=${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch manuscript images');
  }

  const data = await res.json();
  return data.results;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const manuscript = await getManuscript(id);
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
  const [manuscript, images] = await Promise.all([getManuscript(id), getManuscriptImages(id)]);
  return <ManuscriptViewer manuscript={manuscript} images={images} />;
}
