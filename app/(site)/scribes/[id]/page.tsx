import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ScribeViewer } from './scribe-viewer';
import type { ScribeDetail, ScribeHand } from '@/types/scribe-detail';
import { apiFetch } from '@/lib/api-fetch';

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
  try {
    const scribe = await getScribe(id);
    return {
      title: `${scribe.name || `Scribe #${id}`} | Models of Authority`,
      description: `View scribe ${scribe.name || id}${scribe.scriptorium ? ` from ${scribe.scriptorium}` : ''} – Models of Authority`,
    };
  } catch {
    return { title: 'Scribe | Models of Authority' };
  }
}

export default async function ScribePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [scribe, hands] = await Promise.all([getScribe(id), getScribeHands(id)]);

  return <ScribeViewer scribe={scribe} hands={hands} />;
}
