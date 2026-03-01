import { redirect } from 'next/navigation';
import { fetchManuscriptImage } from '@/services/manuscripts';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await fetchManuscriptImage(id);
  redirect(`/manuscripts/${image.item_part}/images/${id}`);
}
